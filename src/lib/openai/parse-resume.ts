/**
 * Resume parsing — lightweight deterministic extraction.
 *
 * Design constraints:
 *  - Single model, single call, no fallback chain, no retry.
 *  - Fail fast: if the model returns bad JSON, throw immediately.
 *  - Token and latency metrics logged on every call for operator visibility.
 *
 * Model is configurable via RESUME_PARSE_MODEL env var so you can swap it
 * without a code deploy. Defaults to openai/gpt-4.1-mini on OpenRouter.
 */

import { createOpenRouterClient } from '@/lib/openrouter/client';
import { clampInputForOperation } from '@/lib/ai/context-hygiene';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import type { ParsedResume } from '@/types/app.types';

// ── Model config ──────────────────────────────────────────────────────────────

const RESUME_PARSE_MODEL =
  process.env.RESUME_PARSE_MODEL ?? 'openai/gpt-4.1-mini';

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  `Extract resume data as JSON. Return only JSON — no markdown, no explanation.`;

const USER_PROMPT_TEMPLATE =
  `Extract from this resume and return JSON matching exactly:
{
  "name": string,
  "email": string,
  "phone": string,
  "skills": string[],
  "experience": [{"company": string, "role": string, "duration": string, "description": string}],
  "projects": [{"name": string, "tech_stack": string[], "description": string}],
  "education": [{"degree": string, "institution": string, "year": string, "cgpa": string}],
  "target_roles": string[]
}

Resume:
{RESUME_TEXT}`;

// ── Validation ────────────────────────────────────────────────────────────────

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

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseResume(rawText: string): Promise<ParsedResume> {
  const t0 = Date.now();

  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('[parse-resume] OpenRouter not configured — set OPENROUTER_API_KEY');
  }

  const clamped = clampInputForOperation(rawText, 'resume_parse');
  const userContent = USER_PROMPT_TEMPLATE.replace('{RESUME_TEXT}', clamped);

  return withOperationDeadline('resume_parse', async (signal) => {
    const response = await client.chat.completions.create(
      {
        model: RESUME_PARSE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userContent },
        ],
        temperature: 0,
        max_tokens:  800,
        response_format: { type: 'json_object' },
      },
      { signal },
    );

    const content = response.choices[0]?.message?.content ?? '';
    const usage   = response.usage;

    console.log(
      `[parse-resume] model=${RESUME_PARSE_MODEL}` +
      ` latency=${Date.now() - t0}ms` +
      ` prompt_tokens=${usage?.prompt_tokens ?? '?'}` +
      ` completion_tokens=${usage?.completion_tokens ?? '?'}` +
      ` total_tokens=${usage?.total_tokens ?? '?'}`,
    );

    const parseResult = parseJsonObject(content);
    if (!parseResult.ok) {
      throw new Error(`[parse-resume] Invalid JSON from model: ${parseResult.error}`);
    }

    if (!isValidParsedResume(parseResult.value)) {
      throw new Error('[parse-resume] Response missing required fields');
    }

    return parseResult.value;
  });
}
