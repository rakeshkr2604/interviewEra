/**
 * LLM extraction of JD requirements — schema-constrained, no scoring.
 */

import {
  completionWithRetries,
  modelPrefersPlainJson,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
} from '@/lib/ai/chat-completion-core';
import { getLlmAttemptTimeoutMs } from '@/lib/ai/operation-registry';
import { getToolChatClient } from '@/lib/ai/tool-chat-completion';
import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';
import { jdRequirementsSchema } from '@/lib/ats/jd-extract-schema';

const JD_PROMPT_CHARS = 4000;

export interface JdRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number | null;
  roleSummary: string | null;
}

export interface JdExtractResult {
  requirements: JdRequirements;
  degraded: boolean;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const EMPTY: JdRequirements = {
  requiredSkills: [],
  preferredSkills: [],
  minYearsExperience: null,
  roleSummary: null,
};

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function buildPrompt(jdSlice: string, repairHint?: string): string {
  const repair = repairHint
    ? `\nPrevious response failed validation:\n${repairHint}\nReturn corrected JSON only.\n`
    : '';

  return (
    `Extract hiring requirements from this job description.\n` +
    `Rules:\n` +
    `- If a skill is clearly required / must-have, put it in requiredSkills.\n` +
    `- If it is nice-to-have / preferred / bonus, put it in preferredSkills.\n` +
    `- Do not invent skills that are not stated or strongly implied.\n` +
    `- minYearsExperience: number only if the JD explicitly states years of experience; else null.\n` +
    `- roleSummary: one short sentence describing the role focus, or null.\n` +
    `- Return ONLY valid JSON:\n` +
    `{\n` +
    `  "requiredSkills": string[],\n` +
    `  "preferredSkills": string[],\n` +
    `  "minYearsExperience": number | null,\n` +
    `  "roleSummary": string | null\n` +
    `}\n` +
    repair +
    `\nJob description:\n${jdSlice}`
  );
}

function resolveModel(): string {
  return process.env.OPENROUTER_ATS_MODEL?.trim() || OPENROUTER_CHEAP_MODEL;
}

async function complete(
  model: string,
  prompt: string,
): Promise<{ content: string; usage?: JdExtractResult['usage'] }> {
  const { client } = getToolChatClient();
  const attemptMs = getLlmAttemptTimeoutMs('free_tool') ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const jsonMode = !modelPrefersPlainJson(model);
  const messages = [{ role: 'user' as const, content: prompt }];

  try {
    const { content, usage } = await completionWithRetries(
      client,
      model,
      messages,
      0,
      jsonMode,
      undefined,
      undefined,
      attemptMs,
    );
    return { content, usage };
  } catch (firstErr) {
    if (!jsonMode) throw firstErr;
    const { content, usage } = await completionWithRetries(
      client,
      model,
      messages,
      0,
      false,
      undefined,
      undefined,
      attemptMs,
    );
    return { content, usage };
  }
}

export async function extractJdRequirements(jdText: string): Promise<JdExtractResult> {
  const model = resolveModel();
  const slice = jdText.slice(0, JD_PROMPT_CHARS);
  let lastZodError = '';
  let lastUsage: JdExtractResult['usage'];

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(slice, attempt === 1 ? lastZodError : undefined);
    const { content, usage } = await complete(model, prompt);
    lastUsage = usage;

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJSON(content));
    } catch {
      lastZodError = 'Response was not valid JSON.';
      continue;
    }

    const result = jdRequirementsSchema.safeParse(parsed);
    if (result.success) {
      return {
        requirements: {
          requiredSkills: result.data.requiredSkills,
          preferredSkills: result.data.preferredSkills,
          minYearsExperience: result.data.minYearsExperience,
          roleSummary: result.data.roleSummary,
        },
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

  console.warn('[ats-jd-extract] Zod validation failed twice — degrading');
  return {
    requirements: { ...EMPTY },
    degraded: true,
    model,
    usage: lastUsage,
  };
}
