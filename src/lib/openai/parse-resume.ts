/**
 * Resume parsing — single fast OpenRouter call, strict token budget.
 */

import { createOpenRouterClient } from '@/lib/openrouter/client';
import { getOperationSpec } from '@/lib/ai/operation-registry';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import { prepareTextForAiParse } from '@/lib/resume/parse-input';
import type { ParsedResume } from '@/types/app.types';

/** Fast, reliable on OpenRouter; override with RESUME_PARSE_MODEL. */
const RESUME_PARSE_MODEL =
  process.env.RESUME_PARSE_MODEL ?? 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = 'Return only valid JSON. No markdown.';

const USER_PROMPT_PREFIX =
  'Extract resume fields. Keep each description under 120 chars. Max 6 experience, 4 projects, 3 education.\n' +
  '{"name":"","email":"","phone":"","skills":[],"experience":[{"company":"","role":"","duration":"","description":""}],' +
  '"projects":[{"name":"","tech_stack":[],"description":""}],"education":[{"degree":"","institution":"","year":"","cgpa":""}],' +
  '"target_roles":[]}\n';

export type ParseResumeTiming = {
  aiMs: number;
  jsonRepairMs: number;
  inputChars: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
};

function coerceString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function coerceStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === 'string').slice(0, 32);
}

function repairParsedResumeShape(data: unknown): ParsedResume | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const repaired: ParsedResume = {
    name: coerceString(d.name),
    email: coerceString(d.email),
    phone: coerceString(d.phone),
    skills: coerceStringArray(d.skills),
    target_roles: coerceStringArray(d.target_roles),
    experience: Array.isArray(d.experience)
      ? d.experience
          .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
          .slice(0, 8)
          .map((e) => ({
            company: coerceString(e.company),
            role: coerceString(e.role),
            duration: coerceString(e.duration),
            description: coerceString(e.description).slice(0, 500),
          }))
      : [],
    projects: Array.isArray(d.projects)
      ? d.projects
          .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
          .slice(0, 6)
          .map((p) => ({
            name: coerceString(p.name),
            tech_stack: coerceStringArray(p.tech_stack).slice(0, 12),
            description: coerceString(p.description).slice(0, 500),
          }))
      : [],
    education: Array.isArray(d.education)
      ? d.education
          .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
          .slice(0, 4)
          .map((ed) => ({
            degree: coerceString(ed.degree),
            institution: coerceString(ed.institution),
            year: coerceString(ed.year),
            cgpa: coerceString(ed.cgpa),
          }))
      : [],
  };
  const hasSignal =
    repaired.skills.length > 0 ||
    repaired.experience.length > 0 ||
    repaired.projects.length > 0 ||
    repaired.name.length > 0;
  return hasSignal ? repaired : null;
}

export async function parseResume(rawText: string): Promise<{
  data: ParsedResume;
  timing: ParseResumeTiming;
}> {
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('[parse-resume] OpenRouter not configured — set OPENROUTER_API_KEY');
  }

  const spec = getOperationSpec('resume_parse');
  const prepared = prepareTextForAiParse(rawText);
  const userContent = `${USER_PROMPT_PREFIX}Resume:\n${prepared}`;

  const aiStart = Date.now();

  const response = await withOperationDeadline('resume_parse', async (signal) => {
    return client.chat.completions.create(
      {
        model: RESUME_PARSE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: spec.temperature,
        max_tokens: spec.maxOutputTokens,
        response_format: { type: 'json_object' },
      },
      { signal },
    );
  });

  const aiMs = Date.now() - aiStart;
  const content = response.choices[0]?.message?.content ?? '';
  const usage = response.usage;

  const jsonStart = Date.now();
  const parseResult = parseJsonObject(content);
  const jsonRepairMs = Date.now() - jsonStart;

  if (!parseResult.ok) {
    throw new Error(`[parse-resume] Invalid JSON from model: ${parseResult.error}`);
  }

  const repaired = repairParsedResumeShape(parseResult.value);
  if (!repaired) {
    throw new Error('[parse-resume] Response missing required fields');
  }

  const timing: ParseResumeTiming = {
    aiMs,
    jsonRepairMs,
    inputChars: prepared.length,
    model: RESUME_PARSE_MODEL,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  };

  console.info(
    '[parse-resume]',
    JSON.stringify({
      model: RESUME_PARSE_MODEL,
      aiMs,
      jsonRepairMs,
      inputChars: prepared.length,
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
    }),
  );

  return { data: repaired, timing };
}
