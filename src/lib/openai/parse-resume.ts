import openai, { callWithRetry } from './client';
import { callMistralChat } from '@/lib/mistral/client';
import type { ParsedResume } from '@/types/app.types';

const PROMPT_TEMPLATE = `You are a resume parsing engine. Extract structured information from the following resume text.
Return ONLY valid JSON. No explanation, no markdown, no preamble.

Schema:
{
  "name": string,
  "email": string,
  "phone": string,
  "skills": string[],
  "experience": [{
    "company": string, "role": string, "duration": string, "description": string
  }],
  "projects": [{
    "name": string, "tech_stack": string[], "description": string
  }],
  "education": [{
    "degree": string, "institution": string, "year": string, "cgpa": string
  }],
  "target_roles": string[]
}

Resume text:
{RESUME_TEXT}`;

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function isValidParsedResume(data: unknown): data is ParsedResume {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.name === 'string' &&
    typeof d.email === 'string' &&
    typeof d.phone === 'string' &&
    Array.isArray(d.skills) &&
    Array.isArray(d.experience) &&
    Array.isArray(d.projects) &&
    Array.isArray(d.education) &&
    Array.isArray(d.target_roles)
  );
}

async function callOpenAI(prompt: string): Promise<string> {
  console.log('[AI] Using OpenAI for resume parsing');
  const response = await callWithRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
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
    console.warn('[AI] OpenAI failed, switching to Mistral:', openaiError);

    try {
      return await callMistralChat(prompt, 0);
    } catch (mistralError) {
      console.error('[AI] Both OpenAI and Mistral failed:', mistralError);
      throw mistralError;
    }
  }
}

export async function parseResume(rawText: string): Promise<ParsedResume> {
  const prompt = PROMPT_TEMPLATE.replace('{RESUME_TEXT}', rawText);

  let content = await getAIContent(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(content));
  } catch {
    try {
      content = await getAIContent(prompt);
      parsed = JSON.parse(extractJSON(content));
    } catch (retryErr) {
      console.error('[parseResume] JSON retry failed:', retryErr);
      throw new Error('Failed to parse resume: invalid JSON from AI after retry');
    }
  }

  if (!isValidParsedResume(parsed)) {
    throw new Error('Failed to parse resume: AI response missing required fields');
  }

  return parsed;
}
