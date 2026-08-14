/**
 * Sentence stream buffer & streaming follow-up generator for P1 LLM → TTS streaming.
 * Overlaps LLM text generation with TTS synthesis by detecting completed natural
 * sentences on `.`, `?`, `!` boundaries.
 */

import { completeInterviewChatStream } from '@/lib/ai/interview-completion';
import { getTokenBudget } from '@/lib/ai/token-budget';
import { clampHistoryForOperation } from '@/lib/ai/context-hygiene';
import type {
  AnswerAnalysis,
  DialogueEntry,
  InterviewContext,
} from '@/lib/interview/types';
import type { InterviewerId } from '@/lib/config/interviewers';
import { getPersona, personaSystemBlock } from '@/lib/interview/interviewer-personas';
import {
  modeFollowUpConstraint,
  type InterviewMode,
} from '@/lib/interview/interview-mode';

const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'vs',
  'eg',
  'ie',
  'etc',
  'st',
  'approx',
  'no',
  'vol',
  'dept',
]);

export class SentenceStreamBuffer {
  private buffer = '';
  private sentenceIndex = 0;
  private readonly minSentenceChars: number;

  constructor(
    private readonly onSentence: (sentence: string, index: number) => void,
    opts?: { minSentenceChars?: number },
  ) {
    this.minSentenceChars = opts?.minSentenceChars ?? 15;
  }

  append(chunk: string): void {
    this.buffer += chunk;
    this.scan();
  }

  private scan(): void {
    let searchStart = 0;

    while (searchStart < this.buffer.length) {
      const matchIndex = this.buffer.slice(searchStart).search(/[.!?\n]/);
      if (matchIndex === -1) break;

      const pos = searchStart + matchIndex;
      const char = this.buffer[pos];
      const nextChar = this.buffer[pos + 1];
      const isEnd = pos === this.buffer.length - 1;
      const hasSpaceAfter = isEnd || /\s/.test(nextChar);

      if (!hasSpaceAfter) {
        searchStart = pos + 1;
        continue;
      }

      if (char === '.') {
        const wordMatch = this.buffer.slice(0, pos).match(/\b([A-Za-z]+)$/);
        const prevWord = wordMatch ? wordMatch[1].toLowerCase() : '';
        if (ABBREVIATIONS.has(prevWord)) {
          searchStart = pos + 1;
          continue;
        }

        const prevChar = this.buffer[pos - 1];
        if (/\d/.test(prevChar ?? '') && /\d/.test(nextChar ?? '')) {
          searchStart = pos + 1;
          continue;
        }
      }

      const sentenceText = this.buffer.slice(0, pos + 1).trim();
      const remaining = this.buffer.slice(pos + 1);

      if (sentenceText.length >= this.minSentenceChars) {
        const idx = this.sentenceIndex++;
        this.buffer = remaining;
        searchStart = 0;
        this.onSentence(sentenceText, idx);
      } else {
        searchStart = pos + 1;
      }
    }
  }

  flush(): void {
    const trimmed = this.buffer.trim();
    if (trimmed) {
      const idx = this.sentenceIndex++;
      this.buffer = '';
      this.onSentence(trimmed, idx);
    }
  }
}

function formatDialogue(history: DialogueEntry[]): string {
  if (!Array.isArray(history) || history.length === 0) return '(start of interview)';
  const turns = clampHistoryForOperation(
    history.map((e) => ({
      speaker: e.speaker === 'interviewer' ? 'You' : 'Candidate',
      text: e.text,
    })),
    'followup_generation',
  );
  if (turns.length === 0) return '(start of interview)';
  return turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
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
- Indian candidates often answer in Hinglish — that is normal; never flag it.`;
}

export async function generateFollowUpStream(
  question: string,
  answer: string,
  analysis: AnswerAnalysis,
  context: InterviewContext,
  dialogueHistory: DialogueEntry[] = [],
  interviewerId: InterviewerId | null = null,
  mode: InterviewMode = 'mixed',
  onSentence?: (sentence: string, index: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const persona = getPersona(interviewerId);
  const personaBlock = personaSystemBlock(persona);
  const modeConstraint = modeFollowUpConstraint(mode);
  const systemPrompt = buildContextualSystemPrompt(personaBlock, modeConstraint);

  const dialogueFormatted = formatDialogue(dialogueHistory);
  const userPrompt = `ROLE: ${context.role} (${context.difficulty})
FOCUS: ${context.focus_areas.join(', ')}

INTERVIEW HISTORY:
${dialogueFormatted}

CURRENT TURN:
Question asked: "${question}"
Candidate answer: "${answer}"

EVALUATOR GAPS DETECTED:
Missing details: ${analysis.missing_details.join('; ') || 'none specified'}
Recommended probe type: ${analysis.recommended_followup_type}

Ask your follow-up question now:`;

  const maxTokens = getTokenBudget('followup_generation', 'openrouter');
  let fullText = '';
  const buffer = onSentence ? new SentenceStreamBuffer(onSentence) : null;

  try {
    const stream = completeInterviewChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens,
      operation: 'followup_generation',
      signal,
    });

    for await (const token of stream) {
      if (signal?.aborted) break;
      fullText += token;
      buffer?.append(token);
    }
    buffer?.flush();

    return fullText.trim();
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('[followup-stream] LLM streaming failed:', err);
    return fullText.trim();
  }
}
