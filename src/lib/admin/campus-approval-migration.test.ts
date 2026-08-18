import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/082_p0_campus_approval_and_authorization.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('P0 campus approval migration', () => {
  it('implements only pending → approved/rejected under a row lock', () => {
    expect(sql).toContain("CHECK (verification_status IN ('pending', 'approved', 'rejected'))");
    expect(sql).toContain("IF v_org.verification_status <> 'pending'");
    expect(sql).toMatch(/FROM public\.campus_organizations[\s\S]*FOR UPDATE;/);
    expect(sql).toContain("p_action NOT IN ('approved', 'rejected')");
  });

  it('atomically updates approved admin state and writes an audit event', () => {
    expect(sql).toContain("SET plan_tier = 'campus_admin'");
    expect(sql).toContain('INSERT INTO public.campus_organization_review_events');
    expect(sql).toMatch(/BEGIN;[\s\S]*CREATE OR REPLACE FUNCTION[\s\S]*COMMIT;/);
  });

  it('keeps the review RPC service-role-only', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.review_campus_organization\(uuid, uuid, text, text\)[\s\S]*FROM PUBLIC, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.review_campus_organization\(uuid, uuid, text, text\)[\s\S]*TO service_role;/,
    );
  });

  it('allows audit creation and rejects every audit update or delete', () => {
    expect(sql).toContain(
      'GRANT SELECT, INSERT ON public.campus_organization_review_events TO service_role',
    );
    expect(sql).not.toContain(
      'GRANT ALL ON public.campus_organization_review_events TO service_role',
    );
    expect(sql).toContain('FOR SELECT TO service_role');
    expect(sql).toContain('FOR INSERT TO service_role');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.reject_campus_review_event_mutation');
    expect(sql).toMatch(
      /CREATE TRIGGER trg_reject_campus_review_event_mutation[\s\S]*?BEFORE UPDATE OR DELETE ON public\.campus_organization_review_events/,
    );
    expect(sql).toContain('Campus organization review events are immutable');
  });

  it('requires approved status in every campus privilege policy', () => {
    for (const policy of [
      'campus_admin manage invites',
      'campus_admin_manage_deadlines',
      'campus_admin_read_enrollments',
      'campus_admin read org interviews',
      'campus_admin read org reports',
    ]) {
      const start = sql.indexOf(`CREATE POLICY "${policy}"`);
      const nextPolicy = sql.indexOf('CREATE POLICY', start + 1);
      const block = sql.slice(start, nextPolicy === -1 ? undefined : nextPolicy);
      expect(start, `${policy} policy missing`).toBeGreaterThan(-1);
      expect(block, `${policy} missing approved predicate`).toContain(
        "verification_status = 'approved'",
      );
    }
  });

  it('revokes authenticated mutation on authoritative tables and users DELETE', () => {
    for (const table of [
      'answers',
      'evaluations',
      'reports',
      'questions',
      'interviews',
      'credit_transactions',
    ]) {
      expect(sql).toContain(`REVOKE INSERT, UPDATE, DELETE ON public.${table} FROM authenticated;`);
    }
    expect(sql).toContain(
      'REVOKE SELECT, INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;',
    );
    expect(sql).toContain('DROP POLICY IF EXISTS "subscriptions_select_own"');
    expect(sql).toContain('REVOKE DELETE ON public.users FROM authenticated;');
  });

  it('preserves authenticated users signup INSERT and own profile UPDATE policies', () => {
    expect(sql).toContain('CREATE POLICY "users_insert_own"');
    expect(sql).toContain('WITH CHECK ((SELECT auth.uid()) = id)');
    expect(sql).not.toContain('REVOKE INSERT ON public.users FROM authenticated');
    expect(sql).not.toContain('DROP POLICY IF EXISTS "users_update_own"');
  });

  it('does not alter existing credit RPCs', () => {
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.deduct_credit');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.add_credit');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.refund_credit');
  });
});
