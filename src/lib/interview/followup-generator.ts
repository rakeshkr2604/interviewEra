/**
 * Follow-up question generation.
 *
 * Template-first: probe_depth / clarify use deterministic templates (fast, no API).
 * LLM is used only for challenge follow-ups and uncovered probe_depth cases, routed
 * through the shared OpenRouter completion client — never raw keys.
 * — never a raw OpenAI client, per CLAUDE.md AI PROVIDER ROUTING.
 */

import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { clampHistoryForOperation } from '@/lib/ai/context-hygiene';
import { questionSimilarity } from '@/lib/interview/deduplicate-questions';
import type {
  AnswerAnalysis,
  DialogueEntry,
  FollowUpType,
  InterviewContext,
} from '@/lib/interview/types';
import type { InterviewerId } from '@/lib/config/interviewers';
import { getPersona, personaSystemBlock } from '@/lib/interview/interviewer-personas';
import {
  modeFollowUpConstraint,
  type InterviewMode,
} from '@/lib/interview/interview-mode';

/**
 * Render the last few turns as a readable transcript for the LLM.
 * Sliding window + per-turn char cap are owned by operation-registry
 * (followup_generation.context). A single rambling turn cannot dominate.
 */
function formatDialogue(history: DialogueEntry[]): string {
  if (!Array.isArray(history) || history.length === 0) return '(start of interview)';
  const turns = clampHistoryForOperation(
    history.map((e) => ({
      speaker: e.speaker === 'interviewer' ? 'You' : 'Candidate',
      text:    e.text,
    })),
    'followup_generation',
  );
  if (turns.length === 0) return '(start of interview)';
  return turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

async function llmQuestion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  staticFallback: string,
): Promise<string> {
  const maxTokens = getTokenBudget('followup_generation', 'openrouter');
  try {
    const { content } = await completeInterviewChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      maxTokens,
      operation: 'followup_generation',
      jsonMode: false,
    });
    const trimmed = content.trim();
    if (trimmed) return trimmed;
    throw new Error('Empty follow-up from OpenRouter');
  } catch (primaryError) {
    console.warn('[followup-generator] OpenRouter follow-up failed, using template:', primaryError);
    return staticFallback;
  }
}

function buildContextualSystemPrompt(
  personaBlock: string,
  modeConstraint: string,
): string {
  return `${personaBlock}

${modeConstraint}

You are a human interviewer at a top Indian company. You listen carefully and probe gaps — not because you're running a script, but because you're genuinely curious about whether the candidate understands what they're talking about.

Rules for your follow-up:
- Stay in character (the persona above).
- Obey the MODE LOCK above without exception.
- Open with a brief natural reaction — not "Sure!" or "Great!" — something like "That makes sense." or "Interesting." or "Right." or just silence into the question. Keep it to 1–3 words max, or skip it.
- Then REFERENCE something the candidate actually said (quote or paraphrase their words).
- PROBE the specific gap — don't ask a generic filler question.
- Ask exactly ONE question. No explanation, no markdown, no preamble beyond the 1–3 word opener.
- Sound conversational, not scripted.
- Indian candidates often answer in Hinglish — that is normal; never flag it.

BANNED (generic filler):
- "Can you quantify that?"
- "Tell me more about your approach."
- "What technologies did you use?"
- "Could you elaborate on that?"

CORRECT (context-aware, references actual answer):
- "You said MongoDB for flexibility — which schema decision specifically? Embedded docs, or references?"
- "You mentioned the deadline was tight. Who decided to cut the testing phase, and what was the risk trade-off?"
- "Interesting. You said 'we handled it' — but who made the final call on the rollback?"`;
}

/**
 * Context-aware follow-up: the LLM sees the running dialogue and the analysis
 * gap, and must reference what the candidate already said. This is the primary
 * path (quiz-bot → conversational interviewer). Templates are the fallback only.
 */
async function generateContextualFollowUp(
  originalQuestion: string,
  userAnswer: string,
  analysis: AnswerAnalysis,
  context: InterviewContext,
  dialogueHistory: DialogueEntry[],
  staticFallback: string,
  interviewerId: InterviewerId | null,
  mode: InterviewMode,
): Promise<string> {
  const persona = getPersona(interviewerId);
  // The last two entries are the current Q + answer (shown explicitly below),
  // so trim them from the "so far" transcript to avoid duplication.
  const priorHistory =
    dialogueHistory.length >= 2 ? dialogueHistory.slice(0, -2) : [];

  const userPrompt = `CONVERSATION SO FAR:
${formatDialogue(priorHistory)}

CURRENT QUESTION YOU ASKED:
${originalQuestion}

CANDIDATE'S LATEST ANSWER:
${userAnswer}

ANALYSIS OF THAT ANSWER:
- Confidence: ${analysis.confidence_level}/10
- Technical depth: ${analysis.technical_depth}/10
- Specificity: ${analysis.specificity}/10
- Missing: ${analysis.missing_details.join(', ') || 'none flagged'}
- Red flags: ${analysis.red_flags.join(', ') || 'none'}
- Probe intent: ${analysis.recommended_followup_type}

Role: ${context.role} (${context.difficulty}, ${context.interview_style})

Generate ONE natural follow-up that references what they said and probes the gap.`;

  return llmQuestion(
    buildContextualSystemPrompt(
      personaSystemBlock(persona),
      modeFollowUpConstraint(mode),
    ),
    userPrompt,
    0.8,
    staticFallback,
  );
}

export async function generateFollowUp(
  originalQuestion: string,
  userAnswer: string,
  analysis: AnswerAnalysis,
  context: InterviewContext,
  dialogueHistory: DialogueEntry[] = [],
  interviewerId: InterviewerId | null = null,
  mode: InterviewMode = 'mixed',
): Promise<string> {
  const followupType = analysis.recommended_followup_type;

  // acknowledge_move_on → no follow-up; orchestrator advances to next question.
  if (followupType === 'acknowledge_move_on') return '';

  // Avoid repeating a follow-up the interviewer already asked in this thread.
  const priorInterviewerTurns = dialogueHistory
    .filter((e) => e.speaker === 'interviewer')
    .map((e) => e.text);
  const isRepeatedFollowUp = (candidate: string): boolean =>
    priorInterviewerTurns.some((q) => questionSimilarity(candidate, q) >= 0.72);

  // Pick a deterministic template as the offline safety net for this gap type,
  // then try the context-aware LLM first (references prior dialogue).
  let staticFallback: string;
  if (followupType === 'probe_depth' && analysis.missing_details.length > 0) {
    staticFallback = await generateProbeDepthFollowUp(
      userAnswer,
      analysis.missing_details,
      context,
    );
  } else if (followupType === 'clarify' && analysis.red_flags.length > 0) {
    staticFallback = await generateClarificationFollowUp(userAnswer, analysis.red_flags);
  } else if (followupType === 'challenge') {
    staticFallback = pick([
      'That makes sense here. But when would your approach NOT work? Give me a scenario.',
      "What's the worst thing that could go wrong with this approach, and how would you prevent it?",
    ]);
  } else {
    // probe_depth/clarify with no concrete signal — still worth a contextual probe.
    staticFallback = "Can you walk me through that part in more detail? I want to understand the specifics.";
  }

  return generateContextualFollowUp(
    originalQuestion,
    userAnswer,
    analysis,
    context,
    dialogueHistory,
    staticFallback,
    interviewerId,
    mode,
  ).then((generated) => (isRepeatedFollowUp(generated) ? staticFallback : generated));
}

async function generateProbeDepthFollowUp(
  answer: string,
  missingDetails: string[],
  context: InterviewContext,
): Promise<string> {
  const templates: Record<string, string[]> = {
    metrics: [
      "That's interesting. What measurable impact did this have? Any specific numbers you can share?",
      'Can you quantify that? What metrics improved after your implementation?',
      'Good. Now tell me - what were the before and after metrics?',
    ],
    timeline: [
      'How long did this take from start to finish?',
      'Walk me through the timeline. When did you start and what were the key milestones?',
      'What was the delivery timeline? Any deadlines you had to work against?',
    ],
    ownership: [
      "You mentioned 'we' - what was YOUR specific role in this? What decisions did YOU make?",
      'I want to understand your individual contribution. What parts did you personally own?',
      'Break this down for me - what did you personally do versus what the team handled?',
    ],
    challenges: [
      'That sounds straightforward. What was actually hard about this? Where did you struggle?',
      'Every project has roadblocks. What obstacles did you face and how did you overcome them?',
      "What didn't go according to plan? Tell me about a problem you had to solve.",
    ],
    impact: [
      'Who benefited from this? What problem did it actually solve?',
      'Why did this matter? What was the business or user impact?',
      'Good. Now tell me - why should anyone care about this project?',
    ],
    learnings: [
      'What did you learn from this experience?',
      'If you could do this project again, what would you do differently?',
      'What was your biggest takeaway from tackling this?',
    ],
  };

  const primaryMissing = missingDetails[0];
  const options = templates[primaryMissing];

  if (options) {
    return pick(options);
  }

  return generateLLMFollowUp(answer, missingDetails, 'probe_depth', context);
}

async function generateClarificationFollowUp(
  answer: string,
  redFlags: string[],
): Promise<string> {
  void answer;
  const templates: Record<string, string[]> = {
    passive_voice: [
      "I noticed you said 'it was done' - who exactly did this? What was your role?",
      "Help me understand - when you say 'it was decided', who made that decision?",
    ],
    no_ownership: [
      "You keep saying 'we'. I want to hear about YOU. What did you personally do?",
      "Let's focus on your individual work. What decisions did YOU make?",
    ],
    generic_answer: [
      'That could describe any project. What made THIS one unique? What specific challenges did YOUR project have?',
      'I need more specifics. What was different about your situation versus a textbook project?',
    ],
    buzzwords_only: [
      'You mentioned several technologies. Pick one and tell me - how did you actually use it? Give me a concrete example.',
      "Let's dig into that. You said you used [technology] - walk me through a specific problem you solved with it.",
    ],
  };

  const primaryFlag = redFlags[0];
  const options = templates[primaryFlag];

  if (options) {
    return pick(options);
  }

  return "Can you clarify that? I want to make sure I understand what you're saying.";
}

async function generateLLMFollowUp(
  answer: string,
  missingDetails: string[],
  followupType: FollowUpType,
  context: InterviewContext,
): Promise<string> {
  const userPrompt = `You are an expert interviewer. The candidate gave this answer:
"${answer}"

The answer is missing: ${missingDetails.join(', ')}
Follow-up type needed: ${followupType}
Interview context: ${context.role} (${context.difficulty})

Generate ONE natural follow-up question that:
1. Sounds conversational and human
2. Probes for the missing information
3. Maintains a supportive but professional tone
4. Is specific to their answer (reference what they said)

Output: Just the question, nothing else.`;

  return llmQuestion(
    'You are an expert interviewer who asks thoughtful follow-up questions.',
    userPrompt,
    0.6,
    "Can you tell me more about that? I'd like to understand the specifics.",
  );
}

/** Acknowledgment phrase before the next question. No API call. */
export function buildAcknowledgment(analysis: AnswerAnalysis): string {
  const avgScore =
    (analysis.technical_depth + analysis.specificity + analysis.communication_clarity) / 3;

  if (avgScore >= 8) {
    return pick([
      "Good. That covers what I was looking for.",
      "Clear and well-structured — I got the full picture.",
      "Strong answer.",
      "That's the depth I was looking for.",
    ]);
  }

  if (avgScore >= 6) {
    return pick([
      "Fair enough.",
      "Okay, I follow that.",
      "Thanks for walking me through that.",
      "Alright, I have a sense of your approach.",
    ]);
  }

  return pick([
    "Okay.",
    "I see.",
    "Alright.",
  ]);
}

/**
 * Deterministic transition phrase before a new question. No API call.
 * Uses modular index so consecutive questions don't repeat the same phrase.
 */
export function buildTransitionPhrase(questionIndex: number): string {
  const phrases = [
    "Let's continue.",
    "Moving on.",
    "Let me shift topics slightly.",
    "Right.",
    "Okay, let's keep going.",
    "Let me ask you something different.",
    "Let's move on.",
  ] as const;
  return phrases[questionIndex % phrases.length];
}
