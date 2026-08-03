/**
 * LLM extraction of JD requirements — schema-constrained, no scoring.
 */

import {
  modelPrefersPlainJson,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
} from '@/lib/ai/chat-completion-core';
import { getLlmAttemptTimeoutMs } from '@/lib/ai/operation-registry';
import { completeToolCompletionLogged, getToolChatClient } from '@/lib/ai/tool-chat-completion';
import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';
import { jdRequirementsSchema } from '@/lib/ats/jd-extract-schema';
import { ATS_JD_MAX_CHARS } from '@/lib/ats/jd-input';

// Must equal the form/action limit — a lower prompt slice silently truncates
// the tail of long JDs (Qualifications / Nice-to-have sections).
const JD_PROMPT_CHARS = ATS_JD_MAX_CHARS;

export interface JdRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  requiredEducation: {
    level: 'diploma' | 'bachelor' | 'master' | 'phd';
    field: string | null;
  } | null;
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
  requiredEducation: null,
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
    `- Each skill entry must be an ATOMIC skill/tool/technology name of 1-4 words ` +
    `(e.g. "Java", "REST APIs", "distributed systems") — NEVER a full sentence or requirement phrase.\n` +
    `- When the JD lists alternatives ("at least one coding language such as Java, Python, or Go"), ` +
    `extract the umbrella category once (e.g. "programming") — not every alternative as separately required.\n` +
    `- Degree/education requirements go ONLY in requiredEducation, never in requiredSkills. ` +
    `level = the MINIMUM acceptable level ("Bachelor's or Master's" → "bachelor"); ` +
    `field = the stated discipline ("engineering") or null. No degree requirement → null.\n` +
    `- Do not invent skills that are not stated or strongly implied.\n` +
    `- minYearsExperience: number only if the JD explicitly states years of experience; else null.\n` +
    `- roleSummary: one short sentence describing the role focus, or null.\n` +
    `- Return ONLY valid JSON:\n` +
    `{\n` +
    `  "requiredSkills": string[],\n` +
    `  "preferredSkills": string[],\n` +
    `  "requiredEducation": { "level": "diploma" | "bachelor" | "master" | "phd", "field": string | null } | null,\n` +
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
    const { content, usage } = await completeToolCompletionLogged({
      client,
      model,
      messages,
      temperature: 0,
      jsonMode,
      attemptTimeoutMs: attemptMs,
      operation: 'ats_jd_extraction',
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
      operation: 'ats_jd_extraction',
    });
    return { content, usage };
  }
}

/** Truncated raw-response snippet for failure logs — enough to diagnose, not a transcript dump. */
const RAW_LOG_SNIPPET_CHARS = 600;

function rawSnippet(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > RAW_LOG_SNIPPET_CHARS
    ? `${trimmed.slice(0, RAW_LOG_SNIPPET_CHARS)}…[+${trimmed.length - RAW_LOG_SNIPPET_CHARS} chars]`
    : trimmed;
}

export async function extractJdRequirements(jdText: string): Promise<JdExtractResult> {
  const model = resolveModel();
  const slice = jdText.slice(0, JD_PROMPT_CHARS);
  let lastZodError = '';
  let lastUsage: JdExtractResult['usage'];
  let lastRaw = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(slice, attempt === 1 ? lastZodError : undefined);
    const { content, usage } = await complete(model, prompt);
    lastUsage = usage;
    lastRaw = content;

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJSON(content));
    } catch {
      lastZodError = 'Response was not valid JSON.';
      console.warn(
        `[ats-jd-extract] attempt ${attempt + 1} returned invalid JSON`,
        { model, raw: rawSnippet(content) },
      );
      continue;
    }

    const result = jdRequirementsSchema.safeParse(parsed);
    if (result.success) {
      return {
        requirements: {
          requiredSkills: result.data.requiredSkills,
          preferredSkills: result.data.preferredSkills,
          requiredEducation: result.data.requiredEducation,
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
    console.warn(
      `[ats-jd-extract] attempt ${attempt + 1} failed schema validation`,
      { model, zod: lastZodError, raw: rawSnippet(content) },
    );
  }

  console.warn('[ats-jd-extract] extraction failed twice — degrading to empty requirements', {
    model,
    lastError: lastZodError,
    raw: rawSnippet(lastRaw),
  });
  return {
    requirements: { ...EMPTY },
    degraded: true,
    model,
    usage: lastUsage,
  };
}
