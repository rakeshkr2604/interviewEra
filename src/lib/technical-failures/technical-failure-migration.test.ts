import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '086_phase6b_technical_failure_cases.sql',
  ),
  'utf8',
);
const feedbackRoute = fs.readFileSync(
  path.join(root, 'src', 'app', 'api', 'feedback', 'route.ts'),
  'utf8',
);
const adminRoute = fs.readFileSync(
  path.join(
    root,
    'src',
    'app',
    'api',
    'admin',
    'technical-failures',
    '[id]',
    'route.ts',
  ),
  'utf8',
);

describe('Phase 6B technical failure migration contract', () => {
  it('creates one durable case per interview and originating feedback', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.technical_failure_cases');
    expect(migration).toContain(
      'CONSTRAINT technical_failure_cases_one_case_per_interview UNIQUE (interview_id)',
    );
    expect(migration).toContain(
      'CONSTRAINT technical_failure_cases_one_case_per_feedback UNIQUE (feedback_id)',
    );
    expect(migration).toContain('ON CONFLICT (interview_id) DO NOTHING');
    expect(feedbackRoute).toContain('if (!caseRow.created)');
    expect(feedbackRoute).toContain('deduped: true');
  });

  it('validates feedback and interview ownership in the database', () => {
    const createCase = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.create_technical_failure_case'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.review_technical_failure_case'),
    );
    expect(createCase).toContain('AND user_id = p_user_id');
    expect(createCase).toContain("AND feedback_category = 'technical_issue'");
    expect(createCase).toContain('Feedback does not belong to authenticated user');
    expect(createCase).toContain('Interview does not belong to authenticated user');
    expect(feedbackRoute).toContain(".eq('user_id', user.id)");
    expect(feedbackRoute).not.toMatch(/user[_I]d\s*[,}:]\s*parsed\.data/);
  });

  it('records only the exact interview-linked debit without timestamp matching', () => {
    expect(migration).toMatch(
      /FROM public\.credit_transactions[\s\S]*?user_id = p_user_id[\s\S]*?interview_id = p_interview_id[\s\S]*?type = 'debit'/,
    );
    expect(migration).not.toMatch(/credit_transactions[\s\S]*?created_at\s*(?:>=|<=|BETWEEN)/i);
    expect(migration).toContain('original_debit_transaction_id UUID');
  });

  it('serializes approval and requires a valid unrestored debit', () => {
    const review = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.review_technical_failure_case'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.grant_service_recovery_credit'),
    );
    expect(review).toContain('FOR UPDATE');
    expect(review).toContain('id = v_case.original_debit_transaction_id');
    expect(review).toContain('interview_id = v_case.interview_id');
    expect(review).toContain("type = 'debit'");
    expect(review).toContain('amount = 1');
    expect(review).toContain('v_credit_deducted IS DISTINCT FROM TRUE');
    expect(review).toContain(
      'No restorable interview credit was found for this interview',
    );
  });

  it('restores exactly one ledger-backed credit and no subscription entitlement', () => {
    expect(migration).toContain('uq_credit_transactions_technical_restore');
    expect(migration).toContain("reason = 'technical_failure_restore'");
    expect(migration).toMatch(
      /SET credits_remaining = credits_remaining \+ 1[\s\S]*?'technical_failure_restore'/,
    );
    expect(migration).toContain('restoration_transaction_id = v_restore_id');
    expect(migration).not.toMatch(
      /UPDATE public\.(payments|subscriptions|plans|campaign)/i,
    );
    expect(migration).not.toMatch(/expires_at\s*=/i);
  });

  it('treats rejection as terminal and duplicate decisions as no-ops', () => {
    expect(migration).toContain("IF v_case.status IN ('approved', 'rejected') THEN");
    expect(migration).toMatch(
      /SELECT v_case\.id, v_case\.status, FALSE,[\s\S]*?v_case\.restoration_transaction_id/,
    );
  });

  it('keeps service recovery separate, late-only, and idempotent', () => {
    const serviceRecovery = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.grant_service_recovery_credit'),
    );
    expect(migration).toContain('uq_credit_transactions_service_recovery');
    expect(serviceRecovery).toContain('FOR UPDATE');
    expect(serviceRecovery).toContain(
      'v_case.resolved_at <= v_case.submitted_at + INTERVAL \'72 hours\'',
    );
    expect(serviceRecovery).toContain("v_case.status <> 'approved'");
    expect(serviceRecovery).toMatch(/reason,\s+interview_id/);
    expect(serviceRecovery).toContain("'service_recovery_credit'");
  });

  it('persists operational timestamps and deduplicated analytics', () => {
    for (const timestamp of ['submitted_at', 'review_started_at', 'resolved_at']) {
      expect(migration).toContain(timestamp);
    }
    for (const event of [
      'technical_issue_reported',
      'technical_issue_approved',
      'technical_issue_rejected',
      'credit_restored',
      'service_recovery_credit_granted',
    ]) {
      expect(migration).toContain(`'${event}'`);
    }
    expect(migration).toContain('uq_product_events_technical_case_event');
    expect(migration).toContain("props->>'technical_failure_case_id'");
  });

  it('keeps all mutation RPCs service-role-only and the admin route authorized', () => {
    expect(migration).toContain(
      'REVOKE ALL ON public.technical_failure_cases FROM anon, authenticated',
    );
    for (const fn of [
      'create_technical_failure_case(UUID, UUID, UUID, TEXT)',
      'review_technical_failure_case(UUID, UUID, TEXT, TEXT, TEXT)',
      'grant_service_recovery_credit(UUID, UUID, TEXT, TEXT)',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${fn}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}`);
    }
    expect(adminRoute).toContain('await requirePlatformAdmin()');
    expect(adminRoute).not.toContain('p_user_id');
    expect(adminRoute).not.toContain('p_amount');
  });
});
