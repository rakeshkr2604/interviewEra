import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { callMistralChat } from '@/lib/mistral/client';
import type { ParsedJobDescription } from '@/types/app.types';

const PROMPT_TEMPLATE = `You extract structured employer job posting content for interview preparation.

Rules:
- Use ONLY facts stated or clearly implied in the text. Ignore greetings, placement-office instructions, and signatures.
- If the posting is prose (no bullet lists), infer 2–8 short, concrete bullets for responsibilities from what the hire will do day-to-day (e.g. sourcing, screening, client coordination, ATS use).
- requirements: qualifications, experience bands, degree expectations; must_have: non-negotiables; nice_to_have: optional preferences.
- skills_keywords: tools, domains, and competencies (e.g. US staffing, recruitment, ATS, communication) as separate short tokens or phrases.
- education_eligibility: degrees or "recent graduate" style constraints as short bullet strings.
- about_role: 1–3 sentences summarizing scope and context; do not duplicate every bullet.
- If compensation or benefits are absent, compensation_notes is "".
- company_employer: The hiring organization name whenever it appears anywhere (e.g. "open position at Appian Infotech for the placement drive", "Role at Acme for campus hiring"). Copy the name exactly as in the document. Use "" only if no company name appears. Never output the phrases "Not specified", "Unknown", "N/A", or "TBD" — use "" for those cases.
- location and employment_type: Use a factual value from the text or "" — never placeholder filler phrases.

Schema:
{
  "role_title": string,
  "company_employer": string,
  "location": string,
  "employment_type": string,
  "about_role": string,
  "responsibilities": string[],
  "requirements": string[],
  "must_have": string[],
  "nice_to_have": string[],
  "skills_keywords": string[],
  "education_eligibility": string[],
  "compensation_notes": string
}

Return ONLY valid JSON. No markdown, no preamble.

Job description text:
{JD_TEXT}`;

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function isValidParsedJobDescription(data: unknown): data is ParsedJobDescription {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const str = (k: string) => typeof d[k] === 'string';
  const strArr = (k: string) => Array.isArray(d[k]) && (d[k] as unknown[]).every((x) => typeof x === 'string');
  return (
    str('role_title') &&
    str('company_employer') &&
    str('location') &&
    str('employment_type') &&
    str('about_role') &&
    str('compensation_notes') &&
    strArr('responsibilities') &&
    strArr('requirements') &&
    strArr('must_have') &&
    strArr('nice_to_have') &&
    strArr('skills_keywords') &&
    strArr('education_eligibility')
  );
}

async function callOpenAI(prompt: string): Promise<string> {
  const { content } = await completeInterviewChat({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });
  return content;
}

async function getAIContent(prompt: string): Promise<string> {
  try {
    return await callOpenAI(prompt);
  } catch (openaiError) {
    console.warn('[parseJobDescription] OpenAI chain failed, Mistral:', openaiError);
    try {
      return await callMistralChat(prompt, 0);
    } catch (mistralError) {
      console.error('[parseJobDescription] Mistral failed:', mistralError);
      throw mistralError;
    }
  }
}

export async function parseJobDescription(rawText: string): Promise<ParsedJobDescription> {
  const prompt = PROMPT_TEMPLATE.replace('{JD_TEXT}', rawText.slice(0, 12_000));

  let content = await getAIContent(prompt);
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(content));
  } catch {
    try {
      content = await getAIContent(prompt);
      parsed = JSON.parse(extractJSON(content));
    } catch (retryErr) {
      console.error('[parseJobDescription] JSON retry failed:', retryErr);
      throw new Error('Failed to parse job description: invalid JSON from AI after retry');
    }
  }

  if (!isValidParsedJobDescription(parsed)) {
    throw new Error('Failed to parse job description: AI response missing required fields');
  }

  return parsed;
}
