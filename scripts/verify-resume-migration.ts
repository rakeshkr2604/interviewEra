/**
 * Local structural verification for 20260718000001_resume_versions_and_snapshots.sql
 * (Dashboard-applied migrations — no live DB required).
 *
 * Usage: npx tsx scripts/verify-resume-migration.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260718000001_resume_versions_and_snapshots.sql',
);

const REQUIRED = [
  'CREATE TABLE IF NOT EXISTS public.resume_versions',
  'CREATE TABLE IF NOT EXISTS public.resume_interview_snapshots',
  'ADD COLUMN IF NOT EXISTS is_primary',
  'ADD COLUMN IF NOT EXISTS profile_group',
  'ADD COLUMN IF NOT EXISTS storage_path',
  'ADD COLUMN IF NOT EXISTS latest_upload_id',
  'ADD COLUMN IF NOT EXISTS lifecycle_status',
  'ADD COLUMN IF NOT EXISTS deleted_at',
  'ADD COLUMN IF NOT EXISTS current_version_id',
  'idx_resumes_one_primary_per_user',
  'resume_versions_select_own',
  'resume_interview_snapshots_select_own',
  'GRANT SELECT ON public.resume_versions TO authenticated',
  'GRANT ALL ON public.resume_versions TO service_role',
  'GRANT SELECT ON public.resume_interview_snapshots TO authenticated',
  'GRANT ALL ON public.resume_interview_snapshots TO service_role',
  "source IN ('upload', 'user_correction', 'backfill')",
  "source IN ('version', 'live_fallback')",
  'INSERT INTO public.resume_versions',
  'SET is_primary = true',
];

function main(): void {
  const sql = readFileSync(MIGRATION, 'utf8');
  const missing = REQUIRED.filter((needle) => !sql.includes(needle));
  if (missing.length > 0) {
    console.error('[verify-resume-migration] FAIL — missing constructs:');
    for (const m of missing) console.error('  -', m);
    process.exit(1);
  }
  console.log('[verify-resume-migration] OK — all required DDL/RLS/backfill constructs present');
  console.log('[verify-resume-migration] Apply via Supabase Dashboard → SQL Editor:');
  console.log('  supabase/migrations/20260718000001_resume_versions_and_snapshots.sql');
}

main();
