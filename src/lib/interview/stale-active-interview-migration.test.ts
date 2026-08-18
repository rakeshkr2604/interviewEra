import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '096_stale_active_interview_start.sql'),
  'utf8',
);

describe('096 stale active interview start contract', () => {
  it('adds created_at without rewriting historical interview rows as now()', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ');
    expect(sql).toContain('COALESCE(started_at, completed_at, NOW() - INTERVAL \'1 day\')');
    expect(sql).not.toMatch(/SET created_at = NOW\(\)/);
  });

  it('abandons stale actives using last activity, not a blanket delete', () => {
    expect(sql).toContain('INTERVAL \'45 minutes\'');
    expect(sql).toContain('interview_last_activity_at');
    expect(sql).toContain("status = 'abandoned'");
    expect(sql).not.toMatch(/DELETE FROM public\.interviews/i);
    expect(sql).toContain('COALESCE(i.completed_at, NOW())');
  });

  it('abandons stale and duplicate actives before replacing the start RPC', () => {
    const staleAt = sql.indexOf("status = 'abandoned'");
    const dupAt = sql.indexOf('ROW_NUMBER() OVER');
    const assertAt = sql.indexOf('HAVING COUNT(*) > 1');
    const lockAt = sql.indexOf('LOCK TABLE public.interviews IN SHARE ROW EXCLUSIVE MODE');
    const rpcAt = sql.lastIndexOf(
      'CREATE OR REPLACE FUNCTION public.create_interview_with_credit',
    );

    expect(lockAt).toBeGreaterThan(-1);
    expect(staleAt).toBeGreaterThan(lockAt);
    expect(dupAt).toBeGreaterThan(staleAt);
    expect(assertAt).toBeGreaterThan(dupAt);
    expect(rpcAt).toBeGreaterThan(assertAt);
    expect(sql).toContain('interview_last_activity_at(id) DESC NULLS LAST');
    expect(sql).toContain('098_one_active_interview_unique_index.sql');
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_one_active_per_user/);
  });

  it('keeps interview creation and debit in one transaction after stale cleanup', () => {
    const fn = sql.slice(
      sql.lastIndexOf('CREATE OR REPLACE FUNCTION public.create_interview_with_credit'),
      sql.lastIndexOf('COMMENT ON FUNCTION public.create_interview_with_credit'),
    );
    const staleAt = fn.indexOf('INTERVAL \'45 minutes\'');
    const insertInterviewAt = fn.indexOf('INSERT INTO public.interviews');
    const debitAt = fn.indexOf("SET credits_remaining = credits_remaining - 1");
    const ledgerAt = fn.indexOf('INSERT INTO public.credit_transactions');
    expect(staleAt).toBeGreaterThan(-1);
    expect(staleAt).toBeLessThan(insertInterviewAt);
    expect(debitAt).toBeGreaterThan(staleAt);
    expect(ledgerAt).toBeGreaterThan(debitAt);
    expect(fn).toContain('FOR UPDATE');
    expect(fn).not.toContain('EXCEPTION WHEN');
  });

  it('raises a structured conflict for a genuine active interview instead of creating a second debit', () => {
    expect(sql).toContain("RAISE EXCEPTION 'Another interview is already active'");
    expect(sql).toContain("'interview_id', v_existing_interview.id");
    expect(sql).toContain('HINT = v_existing_interview.id::TEXT');
  });

  it('does not change debit amount or bypass credit_deducted', () => {
    const fn = sql.slice(
      sql.lastIndexOf('CREATE OR REPLACE FUNCTION public.create_interview_with_credit'),
    );
    expect(fn).toContain('credits_remaining = credits_remaining - 1');
    expect(fn).toContain("amount,\n    reason,\n    interview_id");
    expect(fn).toMatch(/'debit',\s*1,/);
    expect(fn).toContain('v_existing_interview.credit_deducted IS TRUE');
  });
});

const sql098 = fs.readFileSync(
  path.join(process.cwd(), 'supabase', 'migrations', '098_one_active_interview_unique_index.sql'),
  'utf8',
);

describe('098 one active interview unique index contract', () => {
  it('creates the partial unique index without updating interviews in this transaction', () => {
    expect(sql098).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_one_active_per_user[\s\S]*WHERE status IN \('pending', 'in_progress'\)/,
    );
    expect(sql098).not.toMatch(/CREATE UNIQUE INDEX CONCURRENTLY/i);
    expect(sql098).not.toMatch(/UPDATE public\.interviews/i);
    expect(sql098).not.toMatch(/DELETE FROM public\.interviews/i);
    expect(sql098.indexOf('HAVING COUNT(*) > 1')).toBeLessThan(
      sql098.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_one_active_per_user'),
    );
  });
});
