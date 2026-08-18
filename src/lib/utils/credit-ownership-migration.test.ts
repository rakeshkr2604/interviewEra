import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260816184057_phase6a_credit_interview_ownership.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');
const legacyStart = fs.readFileSync(
  path.join(root, 'src', 'app', 'api', 'interview', 'start', 'route.ts'),
  'utf8',
);
const scriptStart = fs.readFileSync(
  path.join(root, 'src', 'app', 'api', 'interview', 'script', 'start', 'route.ts'),
  'utf8',
);

describe('Phase 6A credit ownership migration contract', () => {
  it('keeps historical ownership nullable and adds a durable interview foreign key', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS interview_id UUID');
    expect(sql).not.toMatch(/interview_id UUID NOT NULL/i);
    expect(sql).toContain('REFERENCES public.interviews(id)');
    expect(sql).toContain('ON DELETE SET NULL');
  });

  it('atomically creates one owned interview and one linked debit', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_interview_with_credit');
    expect(sql).toContain('AND user_id = p_user_id');
    expect(sql).toContain('SET credits_remaining = credits_remaining - 1');
    expect(sql).toContain('credit_deducted');
    expect(sql).toMatch(
      /INSERT INTO public\.credit_transactions[\s\S]*?'debit'[\s\S]*?v_interview_id/,
    );
    expect(sql).toContain('uq_credit_transactions_interview_debit');
    expect(sql).toContain("WHERE interview_id IS NOT NULL AND type = 'debit'");
  });

  it('rolls interview creation and debit through one PostgreSQL function', () => {
    const functionBody = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.create_interview_with_credit'),
      sql.indexOf('COMMENT ON FUNCTION public.create_interview_with_credit'),
    );
    expect(functionBody).toContain('UPDATE public.users');
    expect(functionBody).toContain('INSERT INTO public.interviews');
    expect(functionBody).toContain('INSERT INTO public.credit_transactions');
    expect(functionBody).not.toContain('EXCEPTION WHEN');
  });

  it('serializes concurrent starts per user and reuses the committed debit', () => {
    const lockAt = sql.indexOf('FOR UPDATE;');
    const debitAt = sql.indexOf('SET credits_remaining = credits_remaining - 1');
    expect(lockAt).toBeGreaterThan(-1);
    expect(lockAt).toBeLessThan(debitAt);
    expect(sql).toContain("AND i.status IN ('pending', 'in_progress')");
    expect(sql).toContain('v_existing_interview.credit_deducted IS TRUE');
    expect(sql).toContain('v_credit_transaction_id, FALSE');
  });

  it('makes the linked path service-role-only and disables competing debit RPCs', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.deduct_credit\(UUID\)[\s\S]*?service_role/,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.deduct_interview_credit\(UUID, UUID, TEXT\)[\s\S]*?service_role/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_interview_with_credit\([\s\S]*?\) TO service_role/,
    );
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_interview_with_credit\([\s\S]*?\) TO (anon|authenticated)/,
    );
  });

  it('fails closed unless the refund owns one exact interview start debit', () => {
    const refund = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.refund_credit('),
      sql.indexOf('COMMENT ON FUNCTION public.refund_credit(UUID, UUID)'),
    );
    expect(refund).toContain('p_interview_id UUID');
    expect(refund).toMatch(
      /FROM public\.interviews[\s\S]*?id = p_interview_id[\s\S]*?user_id = p_user_id[\s\S]*?FOR UPDATE/,
    );
    expect(refund).toContain('v_credit_deducted IS DISTINCT FROM TRUE');
    expect(refund).toMatch(
      /FROM public\.credit_transactions[\s\S]*?interview_id = p_interview_id[\s\S]*?user_id = p_user_id[\s\S]*?type = 'debit'[\s\S]*?amount = 1[\s\S]*?reason = 'interview_start'/,
    );
    expect(refund).toContain('v_linked_debit_count <> 1');
    expect(refund.indexOf('v_linked_debit_count <> 1')).toBeLessThan(
      refund.indexOf('SET credits_remaining = credits_remaining + 1'),
    );
    expect(refund).toContain('SET credit_deducted = FALSE');
    expect(refund).toMatch(
      /INSERT INTO public\.credit_transactions[\s\S]*?'interview_start_failed_refund'[\s\S]*?p_interview_id/,
    );
  });

  it('prevents a second start-failure refund for the same interview', () => {
    expect(sql).toContain('uq_credit_transactions_interview_start_failed_refund');
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_interview_start_failed_refund[\s\S]*?ON public\.credit_transactions \(interview_id\)[\s\S]*?reason = 'interview_start_failed_refund'/,
    );
  });

  it('routes both interview engines through the canonical ownership helper', () => {
    for (const source of [legacyStart, scriptStart]) {
      expect(source).toContain('createInterviewWithCredit({');
      expect(source).not.toContain('checkAndDeductCredit');
      expect(source).not.toMatch(/\.from\(['"]interviews['"]\)\s*\.insert/);
      expect(source.indexOf('deduped: true')).toBeLessThan(
        source.indexOf('createInterviewWithCredit({'),
      );
    }
    expect(legacyStart).toContain('await refundCredit(user.id, interviewId)');
  });
});
