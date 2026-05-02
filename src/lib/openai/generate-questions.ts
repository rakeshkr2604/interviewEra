import openai, { callWithRetry } from './client';
import { callMistralChat } from '@/lib/mistral/client';
import type { ParsedResume, Question } from '@/types/app.types';

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

interface GenerateQuestionsInput {
  parsedResume: ParsedResume;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount?: number;
}

function buildResumeSummary(resume: ParsedResume, role: string): string {
  const skills = resume.skills.slice(0, 15).join(', ');
  const exp = resume.experience
    .map((e) => `${e.role} at ${e.company} (${e.duration})`)
    .join('; ');
  const projects = resume.projects
    .map((p) => `${p.name} (${p.tech_stack.slice(0, 3).join(', ')})`)
    .join(', ');
  return (
    `Name: ${resume.name}. Target role: ${role}. Skills: ${skills}.` +
    (exp ? ` Experience: ${exp}.` : '') +
    (projects ? ` Projects: ${projects}.` : '')
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
}: GenerateQuestionsInput): Promise<GenerateQuestionsResult> {
  const resumeSummary = buildResumeSummary(parsedResume, role);

  const prompt =
    `You are an expert technical interviewer at a top Indian tech company.\n` +
    `Generate exactly ${questionCount} interview questions for a ${role} position.\n` +
    `The candidate's profile: ${resumeSummary}\n` +
    `Difficulty level: ${difficulty}\n\n` +
    `Rules:\n` +
    `- Questions must be specific to the candidate's actual projects and skills\n` +
    `- Mix: 40% technical, 30% behavioral, 30% situation-based\n` +
    `- No repetitive questions\n` +
    `- Each question must have a rubric for evaluation\n\n` +
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
