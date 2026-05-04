import openai, { callWithRetry } from './client';
import { callMistralChat } from '@/lib/mistral/client';
import type { ParsedResume, Question } from '@/types/app.types';
import type { InterviewGoal } from '@/types/onboarding.types';
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers';

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionGenerationError';
  }
}

interface GeneratedQuestion {
  order: number;
  question_text: string;
  category: Question['category'];
  rubric: Question['rubric'];
}

export interface GenerateQuestionsResult {
  questions: GeneratedQuestion[];
}

export interface GenerateQuestionsInput {
  parsedResume: ParsedResume;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  goal: InterviewGoal;
  interviewMode: 'technical' | 'hr_behavioral';
  experienceYears: number;
  interviewerId: InterviewerId;
  /** Employer JD excerpt — improves role alignment when present */
  jobDescription?: string;
}

function goalToneRules(goal: InterviewGoal): string {
  switch (goal) {
    case 'fresher_placement':
      return (
        `Goal: Fresher placement — prioritize fundamentals and concrete projects from the resume; ` +
        `avoid system architecture or large-scale design questions; keep scenarios internship/placement appropriate.`
      );
    case 'job_switch':
      return (
        `Goal: Job switch — emphasize transferable skills, motivations for change, stack fit, ` +
        `and how past wins apply to the target role.`
      );
    case 'promotion_prep':
      return (
        `Goal: Promotion prep — emphasize leadership, ownership, stakeholder decisions, ` +
        `and justified trade-offs for senior scope.`
      );
    case 'general_practice':
    default:
      return `Goal: General practice — balanced tone without biasing toward one career stage.`;
  }
}

function seniorityRules(experienceYears: number): string {
  if (experienceYears <= 0) {
    return (
      `Seniority: 0 years — conceptual clarity, definitions, and explain-your-project depth only; ` +
      `no expectation of production war stories or large-scale architecture.`
    );
  }
  if (experienceYears <= 3) {
    return (
      `Seniority: 1–3 years — applied scenarios, debugging, ownership of features, ` +
      `and realistic team workflows; moderate depth.`
    );
  }
  return (
    `Seniority: 4+ years — architectural choices, trade-offs, scale/reliability, ` +
    `mentorship, and stakeholder judgment where relevant to the role.`
  );
}

function difficultyRules(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return `Difficulty: Easy — favor definitions, straightforward scenarios, and foundational reasoning.`;
    case 'hard':
      return `Difficulty: Hard — include edge cases, trade-offs, and failure modes where appropriate to mode and seniority.`;
    case 'medium':
    default:
      return `Difficulty: Medium — balanced application-level scenarios with some depth.`;
  }
}

function interviewModeRules(interviewMode: 'technical' | 'hr_behavioral'): string {
  if (interviewMode === 'hr_behavioral') {
    return (
      `Interview mode: HR / Behavioral — STAR-format behavioral stories must dominate. ` +
      `Use situational prompts for the remainder. ` +
      `Do NOT ask data-structure puzzles, algorithmic coding tasks, or textbook DSA. ` +
      `Reserve the "technical" category label only for rare competency probes that are still non-DSA ` +
      `(e.g. prioritization, stakeholder clarity); prefer "behavioral" and "situational".`
    );
  }
  return (
    `Interview mode: Technical — emphasize stack depth, system design where seniority allows, ` +
    `DSA only when appropriate to the role (e.g. SWE) and never as the entire set; ` +
    `keep behavioral/situational minimal but present for a realistic loop.`
  );
}

function interviewerPersonaRules(interviewerId: InterviewerId): string {
  const iv = getInterviewerById(interviewerId);
  if (!iv) return '';
  if (iv.id === 'priya') {
    return (
      `Interviewer persona: Priya (Senior Recruiter) — warm, rapport-building openers, HR-lean phrasing, ` +
      `professional but supportive framing in how questions are written.`
    );
  }
  return (
    `Interviewer persona: Arjun (Technical Lead) — direct, concise questions with technical pressure; ` +
    `minimal hand-holding; expect precise reasoning in the prompts.`
  );
}

function buildResumeSummary(resume: ParsedResume, role: string): string {
  const skills = resume.skills.slice(0, 15).join(', ');
  const exp = resume.experience
    .map((e) => `${e.role} at ${e.company} (${e.duration})`)
    .join('; ');
  const projects = resume.projects
    .map((p) => {
      const tech = p.tech_stack.slice(0, 4).join(', ');
      const desc = p.description.trim();
      const short = desc.length > 140 ? `${desc.slice(0, 137)}…` : desc;
      return `${p.name}${tech ? ` [${tech}]` : ''}${short ? `: ${short}` : ''}`;
    })
    .join(' | ');
  const education = resume.education
    .slice(0, 3)
    .map((e) => `${e.degree} at ${e.institution} (${e.year})`)
    .join('; ');
  return (
    `Name: ${resume.name}. Target role: ${role}. Skills: ${skills}.` +
    (exp ? ` Experience: ${exp}.` : '') +
    (projects ? ` Projects: ${projects}.` : '') +
    (education ? ` Education: ${education}.` : '')
  );
}

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function isValidQuestionsResponse(
  data: unknown
): data is { questions: GeneratedQuestion[] } {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.questions) || d.questions.length === 0) return false;

  return d.questions.every((q: unknown) => {
    if (!q || typeof q !== 'object') return false;
    const qObj = q as Record<string, unknown>;
    if (typeof qObj.order !== 'number') return false;
    if (typeof qObj.question_text !== 'string') return false;
    if (!['technical', 'behavioral', 'situational'].includes(qObj.category as string))
      return false;
    const rubric = qObj.rubric as Record<string, unknown>;
    if (!rubric || typeof rubric !== 'object') return false;
    if (!Array.isArray(rubric.ideal_keywords)) return false;
    if (typeof rubric.ideal_structure !== 'string') return false;
    if (!Array.isArray(rubric.red_flags)) return false;
    return true;
  });
}

async function callOpenAI(prompt: string): Promise<string> {
  const response = await callWithRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })
  );
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return content;
}

async function getAIContent(prompt: string): Promise<string> {
  try {
    return await callOpenAI(prompt);
  } catch (openaiError) {
    console.warn('[AI] OpenAI failed for question generation, switching to Mistral:', openaiError);

    try {
      return await callMistralChat(prompt, 0.7);
    } catch (mistralError) {
      console.error('[AI] Both OpenAI and Mistral failed for question generation:', mistralError);
      throw mistralError;
    }
  }
}

export async function generateQuestions({
  parsedResume,
  role,
  difficulty,
  questionCount = 6,
  goal,
  interviewMode,
  experienceYears,
  interviewerId,
  jobDescription,
}: GenerateQuestionsInput): Promise<GenerateQuestionsResult> {
  const resumeSummary = buildResumeSummary(parsedResume, role);
  const jdSnippet = jobDescription?.trim().slice(0, 3500);
  const jdBlock = jdSnippet
    ? `\nEmployer job description (align competencies and scenarios with this posting; do not paste it verbatim into questions):\n${jdSnippet}\n`
    : '';

  const calibration =
    [
      goalToneRules(goal),
      seniorityRules(experienceYears),
      difficultyRules(difficulty),
      interviewModeRules(interviewMode),
      interviewerPersonaRules(interviewerId),
    ].join('\n');

  const prompt =
    `You are an expert interviewer at a top Indian tech company.\n` +
    `Generate exactly ${questionCount} interview questions for a ${role} position.\n` +
    `The candidate's profile: ${resumeSummary}${jdBlock}\n` +
    `${calibration}\n\n` +
    `Rules:\n` +
    `- Questions must reference concrete skills, employers, projects, or education from the profile when applicable.\n` +
    `- No repetitive or overlapping questions.\n` +
    `- Each question must include a rubric suitable for evaluation.\n\n` +
    `Return ONLY valid JSON:\n` +
    `{\n` +
    `  "questions": [{\n` +
    `    "order": number,\n` +
    `    "question_text": string,\n` +
    `    "category": "technical" | "behavioral" | "situational",\n` +
    `    "rubric": {\n` +
    `      "ideal_keywords": string[],\n` +
    `      "ideal_structure": string,\n` +
    `      "red_flags": string[]\n` +
    `    }\n` +
    `  }]\n` +
    `}`;

  let content = await getAIContent(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(content));
  } catch {
    try {
      content = await getAIContent(prompt);
      parsed = JSON.parse(extractJSON(content));
    } catch (retryErr) {
      console.error('[generate-questions] JSON retry failed:', retryErr);
      throw new QuestionGenerationError(
        'Failed to parse questions: invalid JSON from AI after retry'
      );
    }
  }

  if (!isValidQuestionsResponse(parsed)) {
    throw new QuestionGenerationError(
      'Failed to parse questions: AI response missing required fields'
    );
  }

  if (parsed.questions.length < questionCount) {
    throw new QuestionGenerationError(
      `AI generated ${parsed.questions.length} questions instead of ${questionCount}`
    );
  }

  return { questions: parsed.questions.slice(0, questionCount) };
}
