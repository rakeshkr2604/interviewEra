/**
 * Resume parsing — parse-v2 JSON for interview personalization
 * (role/skills/band + experience/education/projects).
 */

import { createOpenRouterClient } from '@/lib/openrouter/client';
import { getOperationSpec } from '@/lib/ai/operation-registry';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import { prepareTextForAiParse } from '@/lib/resume/parse-input';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { parsedResumeV2Schema } from '@/lib/resume/parsed-resume-schema';
import type { ParsedResume } from '@/types/app.types';

const RESUME_PARSE_MODEL =
  process.env.RESUME_PARSE_MODEL ?? 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = 'Return only valid JSON. No markdown. Never invent employers, schools, or project names.';

const USER_PROMPT_PREFIX =
  'For mock interview setup. Extract this JSON shape (fill what exists; leave arrays empty when absent):\n' +
  '{\n' +
  '  "target_role":"",\n' +
  '  "skills":[],\n' +
  '  "experience_estimate":"",\n' +
  '  "experience":[{"organization":"","title":"","date_range":"","bullets":[]}],\n' +
  '  "education":[{"institution":"","degree":"","year_range":""}],\n' +
  '  "projects":[{"name":"","description":"","technologies":[]}],\n' +
  '  "sections_missing":{"experience":false,"education":false,"projects":false}\n' +
  '}\n' +
  'Rules:\n' +
  '- target_role: one primary role (e.g. Software Engineer).\n' +
  '- skills: max 12 short tech/soft skills.\n' +
  '- experience_estimate: one of Fresher, 0-1 years, 1-3 years, 3-5 years, 5+ years.\n' +
  '  CRITICAL: Internships, traineeships, apprenticeships, and co-ops do NOT count as professional years.\n' +
  '  If experience is exclusively internships/trainees (no full-time/founder/SDE roles), use "0-1 years" (fresher).\n' +
  '  For mixed history, estimate years from full-time/professional roles only.\n' +
  '- experience: max 4 jobs/internships; date_range as written text; max 3 short bullets each. Freshers may have internships or [].\n' +
  '- education: max 4; year_range or graduation year as text.\n' +
  '- projects: max 4; highest priority — use real project names from the resume; technologies as short strings.\n' +
  '- If a section is missing/unreadable: return [] and set the matching sections_missing.* flag to true. Do not fabricate.\n';

export type ParseResumeTiming = {
  aiMs: number;
  jsonRepairMs: number;
  inputChars: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
};

function repairInterviewProfile(data: unknown): ParsedResume | null {
  const zod = parsedResumeV2Schema.safeParse(data);
  if (!zod.success) {
    // Still try coerce for partial objects — empty sections stay empty.
    const profile = coerceParsedResume(data);
    const hasSignal =
      profile.skills.length > 0 ||
      (profile.target_role.length > 0 && profile.target_role !== 'Software Engineer') ||
      (profile.projects?.length ?? 0) > 0;
    return hasSignal ? profile : null;
  }

  const profile = coerceParsedResume(zod.data);
  const hasSignal =
    profile.skills.length > 0 ||
    (profile.target_role.length > 0 && profile.target_role !== 'Software Engineer') ||
    (profile.projects?.length ?? 0) > 0 ||
    (profile.education?.length ?? 0) > 0 ||
    (profile.experience?.length ?? 0) > 0;
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
      projects: repaired.projects?.length ?? 0,
      education: repaired.education?.length ?? 0,
      experience: repaired.experience?.length ?? 0,
    }),
  );

  return { data: repaired, timing };
}
