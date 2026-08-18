import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '099_abandoned_interview_one_resume.sql'),
  'utf8',
);

describe('099 abandoned interview one resume contract', () => {
  it('adds a one-shot resume flag and does not delete interview rows', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS abandoned_resume_used BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).not.toMatch(/DELETE FROM public\.interviews/i);
  });

  it('reopens the same interview without changing credit amounts', () => {
    const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.resume_abandoned_interview'));
    expect(fn).toContain("status = 'in_progress'");
    expect(fn).toContain('abandoned_resume_used = TRUE');
    expect(fn).toContain('abandoned_resumed_at = NOW()');
    expect(fn).toContain('v_target.credit_deducted IS DISTINCT FROM TRUE');
    expect(fn).toContain("v_target.abandoned_resume_used IS TRUE");
    expect(fn).not.toContain('credits_remaining = credits_remaining - 1');
    expect(fn).not.toContain('credits_remaining = credits_remaining + 1');
    expect(fn).not.toContain('refund_credit');
  });

  it('keeps the one-active invariant and stays service-role-only', () => {
    expect(sql).toContain('i.abandoned_resumed_at');
    expect(sql).toContain("'other_active'");
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.resume_abandoned_interview(UUID, UUID)');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.resume_abandoned_interview(UUID, UUID)');
    expect(sql).toContain('TO service_role');
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.resume_abandoned_interview\(UUID, UUID\)\s+TO (anon|authenticated)/);
  });
});
