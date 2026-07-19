/**
 * LLM structured field extraction for ATS checker — scoring is NOT done by the model.
 */

import {
  modelPrefersPlainJson,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
} from '@/lib/ai/chat-completion-core';
import { getLlmAttemptTimeoutMs } from '@/lib/ai/operation-registry';
import { completeToolCompletionLogged, getToolChatClient } from '@/lib/ai/tool-chat-completion';
import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';
import { extractedResumeSchema } from '@/lib/ats/extract-schema';
import type { ExtractedResumeData } from '@/lib/ats/types';
import { EMPTY_EXTRACTED } from '@/lib/ats/types';

const RESUME_PROMPT_CHARS = 8000;

/**
 * Field Extraction Accuracy weights (judgment call — documented, not a universal standard).
 *
 * Contact fields matter most for recruiter reachability after parse:
 *   name 15, email 20, phone 15, location 10, linkedin 5  → 65
 * Section presence (at least one meaningful entry):
 *   experience 15, education 10, skills 10                 → 35
 * Total weight = 100. Score = sum of earned weights.
 */
const FIELD_WEIGHTS = {
  name: 15,
  email: 20,
  phone: 15,
  location: 10,
  linkedin: 5,
  experience: 15,
  education: 10,
  skills: 10,
} as const;

export type WeightedFieldKey = keyof typeof FIELD_WEIGHTS;

function experiencePopulated(exp: ExtractedResumeData['experience']): boolean {
  return exp.some(
    (e) =>
      (e.company && e.company.trim()) ||
      (e.title && e.title.trim()) ||
      (e.startDate && e.startDate.trim()),
  );
}

function educationPopulated(edu: ExtractedResumeData['education']): boolean {
  return edu.some(
    (e) => (e.institution && e.institution.trim()) || (e.degree && e.degree.trim()),
  );
}

export function scoreFieldExtraction(extracted: ExtractedResumeData): {
  score: number;
  missingFields: string[];
  earned: Partial<Record<WeightedFieldKey, boolean>>;
} {
  const earned: Partial<Record<WeightedFieldKey, boolean>> = {};
  const missingFields: string[] = [];
  let total = 0;

  const mark = (key: WeightedFieldKey, ok: boolean) => {
    earned[key] = ok;
    if (ok) total += FIELD_WEIGHTS[key];
    else missingFields.push(key);
  };

  mark('name', Boolean(extracted.name?.trim()));
  mark('email', Boolean(extracted.email?.trim()));
  mark('phone', Boolean(extracted.phone?.trim()));
  mark('location', Boolean(extracted.location?.trim()));
  mark('linkedin', Boolean(extracted.linkedin?.trim()));
  mark('experience', experiencePopulated(extracted.experience));
  mark('education', educationPopulated(extracted.education));
  mark('skills', extracted.skills.length > 0);

  return {
    score: Math.round(Math.min(100, Math.max(0, total))),
    missingFields,
    earned,
  };
}

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function buildExtractionPrompt(resumeSlice: string, repairHint?: string): string {
  const repair = repairHint
    ? `\nPrevious response failed validation:\n${repairHint}\nReturn corrected JSON only.\n`
    : '';

  return (
    `Extract structured contact and resume fields from the resume text below.\n` +
    `Rules:\n` +
    `- If a field cannot be found in the text, return null (or [] for arrays). Do not guess or infer missing information.\n` +
    `- Do not invent employers, degrees, skills, or contact details.\n` +
    `- Return ONLY valid JSON matching this shape:\n` +
    `{\n` +
    `  "name": string | null,\n` +
    `  "email": string | null,\n` +
    `  "phone": string | null,\n` +
    `  "linkedin": string | null,\n` +
    `  "location": string | null,\n` +
    `  "experience": [{ "company": string | null, "title": string | null, "startDate": string | null, "endDate": string | null }],\n` +
    `  "education": [{ "institution": string | null, "degree": string | null, "year": string | null }],\n` +
    `  "skills": string[]\n` +
    `}\n` +
    repair +
    `\nResume text:\n${resumeSlice}`
  );
}

function toExtracted(
  data: import('zod').infer<typeof extractedResumeSchema>,
): ExtractedResumeData {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    linkedin: data.linkedin,
    location: data.location,
    experience: data.experience.map((e) => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
    education: data.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      year: e.year,
    })),
    skills: data.skills,
  };
}

/** Default OpenRouter model for ATS extraction — matches cheap-model cost policy. */
export function resolveAtsExtractionModel(): string {
  return process.env.OPENROUTER_ATS_MODEL?.trim() || OPENROUTER_CHEAP_MODEL;
}

export interface FieldExtractionLlmResult {
  extracted: ExtractedResumeData;
  degraded: boolean;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

async function completeExtraction(
  model: string,
  prompt: string,
): Promise<{ content: string; usage?: FieldExtractionLlmResult['usage'] }> {
  const { client } = getToolChatClient();
  const attemptMs = getLlmAttemptTimeoutMs('free_tool') ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const jsonMode = !modelPrefersPlainJson(model);
  const messages = [{ role: 'user' as const, content: prompt }];

  try {
    const { content, usage } = await completeToolCompletionLogged({
      client,
      model,
      messages,
      temperature: 0,
      jsonMode,
      attemptTimeoutMs: attemptMs,
      operation: 'ats_field_extraction',
    });
    return { content, usage };
  } catch (firstErr) {
    if (!jsonMode) throw firstErr;
    const { content, usage } = await completeToolCompletionLogged({
      client,
      model,
      messages,
      temperature: 0,
      jsonMode: false,
      attemptTimeoutMs: attemptMs,
      operation: 'ats_field_extraction',
    });
    return { content, usage };
  }
}

/**
 * One structured extraction call (+ one validation retry). Never asks the model for a score.
 */
export async function extractResumeFields(rawText: string): Promise<FieldExtractionLlmResult> {
  const model = resolveAtsExtractionModel();
  const resumeSlice = rawText.slice(0, RESUME_PROMPT_CHARS);
  let lastZodError = '';
  let lastUsage: FieldExtractionLlmResult['usage'];

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildExtractionPrompt(
      resumeSlice,
      attempt === 1 ? lastZodError : undefined,
    );

    const { content, usage } = await completeExtraction(model, prompt);
    lastUsage = usage;

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJSON(content));
    } catch {
      lastZodError = 'Response was not valid JSON.';
      continue;
    }

    const result = extractedResumeSchema.safeParse(parsed);
    if (result.success) {
      return {
        extracted: toExtracted(result.data),
        degraded: false,
        model,
        usage: lastUsage,
      };
    }
    lastZodError = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }

  console.warn('[ats-extract] Zod validation failed twice — degrading to empty extraction');
  return {
    extracted: { ...EMPTY_EXTRACTED },
    degraded: true,
    model,
    usage: lastUsage,
  };
}
