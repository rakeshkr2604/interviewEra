import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join } from 'node:path';

config({ path: join(process.cwd(), '.env.local') });
process.env.SCRIPT_REPORT_FORCE_SYNTHESIS_FAIL = '1';

async function loadMod<T extends Record<string, unknown>>(path: string): Promise<T> {
  const ns = await import(path);
  return ((ns as { default?: T }).default ?? ns) as T;
}

const interviewId = process.argv[2] ?? '889b2c98-c7ef-4b66-b365-93a9e6433aa1';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const { data: interview, error } = await admin
  .from('interviews')
  .select('id, user_id, status')
  .eq('id', interviewId)
  .maybeSingle();

if (error || !interview) {
  console.log(JSON.stringify({ ok: false, error: error?.message ?? 'interview not found' }));
  process.exit(1);
}

const { loadOrGenerateScriptReport } = await loadMod<{
  loadOrGenerateScriptReport: (args: Record<string, unknown>) => Promise<{
    ok: boolean;
    report?: {
      status: string;
      overall: number | null;
      scored_answer_count: number;
      synthesis_prompt_version?: string | null;
      synthesis?: {
        recruiter_assessment?: string;
        meta?: { used_llm?: boolean; synthesis_version?: string; normalizer_coercions?: string[] };
      } | null;
    };
  }>;
}>('../src/lib/interview/script-report/generate.ts');

await admin.from('script_interview_reports').delete().eq('interview_id', interviewId);
const gen = await loadOrGenerateScriptReport({
  serviceClient: admin,
  interviewId,
  userId: interview.user_id,
  forceRegenerate: true,
});

const assessment = gen.ok ? String(gen.report?.synthesis?.recruiter_assessment ?? '') : '';
console.log(
  JSON.stringify(
    {
      ok: gen.ok,
      interviewId,
      userId: interview.user_id,
      status: gen.ok ? gen.report?.status : null,
      usedLlm: gen.ok ? (gen.report?.synthesis?.meta?.used_llm ?? null) : null,
      synthesisPromptVersion: gen.ok ? (gen.report?.synthesis_prompt_version ?? null) : null,
      metaVersion: gen.ok ? (gen.report?.synthesis?.meta?.synthesis_version ?? null) : null,
      normalizerCoercions: gen.ok
        ? (gen.report?.synthesis?.meta?.normalizer_coercions ?? null)
        : null,
      looksLikeDeterministicFallback:
        assessment.startsWith('Across ') && assessment.includes('your weighted session score is'),
      assessmentPreview: assessment.slice(0, 280),
      overall: gen.ok ? gen.report?.overall : null,
      scored: gen.ok ? gen.report?.scored_answer_count : null,
      forceFlag: process.env.SCRIPT_REPORT_FORCE_SYNTHESIS_FAIL,
      dbRow: (
        await admin
          .from('script_interview_reports')
          .select('status, synthesis_model, synthesis')
          .eq('interview_id', interviewId)
          .maybeSingle()
      ).data,
    },
    null,
    2,
  ),
);
