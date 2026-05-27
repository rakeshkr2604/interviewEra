/**
 * Resume parsing — minimal JSON for interview personalization only.
 */

import { createOpenRouterClient } from '@/lib/openrouter/client';
import { getOperationSpec } from '@/lib/ai/operation-registry';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import { prepareTextForAiParse } from '@/lib/resume/parse-input';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import type { ParsedResume } from '@/types/app.types';

const RESUME_PARSE_MODEL =
  process.env.RESUME_PARSE_MODEL ?? 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = 'Return only valid JSON. No markdown.';

const USER_PROMPT_PREFIX =
  'For mock interview setup only (not a full resume). Extract:\n' +
  '{"target_role":"","skills":[],"experience_estimate":""}\n' +
  'target_role: one primary role (e.g. Software Engineer).\n' +
  'skills: max 12 short tech/soft skills.\n' +
  'experience_estimate: one of Fresher, 0-1 years, 1-3 years, 3-5 years, 5+ years.\n';

export type ParseResumeTiming = {
  aiMs: number;
  jsonRepairMs: number;
  inputChars: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
};

function repairInterviewProfile(data: unknown): ParsedResume | null {
  const profile = coerceParsedResume(data);
  const hasSignal =
    profile.skills.length > 0 ||
    (profile.target_role.length > 0 && profile.target_role !== 'Software Engineer');
  return hasSignal ? profile : null;
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

  const repaired = repairInterviewProfile(parseResult.value);
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
