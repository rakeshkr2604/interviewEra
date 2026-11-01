import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_PLAN } from '@/lib/pricing/plans';

const MIGRATIONS = join(process.cwd(), 'supabase/migrations');
const sql119 = readFileSync(join(MIGRATIONS, '119_free_tier_two_signup_credits.sql'), 'utf8');
const sql120 = readFileSync(join(MIGRATIONS, '120_free_tool_first_completed_milestone.sql'), 'utf8');
const code119 = sql119.replace(/--.*$/gm, '');

describe('migration 119 — new Free signups get 2 credits', () => {
  it('matches the app-side FREE_PLAN constant used by the ensure-public-user fallback', () => {
    expect(FREE_PLAN.credits).toBe(2);
    expect(code119).toMatch(/ALTER COLUMN credits_remaining SET DEFAULT 2;/);
    expect(code119).toMatch(/'free',\s*2\s*\)/);
  });

  it('grandfathers every existing account: no UPDATE / DELETE of users or credit history', () => {
    expect(code119).not.toMatch(/\bUPDATE\b/i);
    expect(code119).not.toMatch(/\bDELETE\b/i);
    expect(code119).not.toMatch(/credit_transactions/i);
  });

  it('preserves the 012 display-name sanitisation, SECURITY DEFINER and pinned search_path', () => {
    expect(code119).toContain('public.sanitize_user_display_name(NEW.raw_user_meta_data->>\'name\')');
    expect(code119).toMatch(/SECURITY DEFINER/);
    expect(code119).toMatch(/SET search_path = public/);
  });

  it('keeps the 059 EXECUTE lockdown on the trigger function', () => {
    expect(code119).toMatch(/REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC;/);
    expect(code119).toMatch(/REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM anon, authenticated;/);
  });

  it('is transactional', () => {
    expect(code119.trim().startsWith('BEGIN;')).toBe(true);
    expect(code119.trim().endsWith('COMMIT;')).toBe(true);
  });
});

describe('migration 120 — first free-tool milestone dedupe', () => {
  it('adds a partial unique index scoped to the milestone event only', () => {
    const code = sql120.replace(/--.*$/gm, '');
    expect(code).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_product_events_free_tool_first_completed/);
    expect(code).toMatch(/ON public\.product_events \(event_name, user_id\)/);
    expect(code).toMatch(/WHERE event_name = 'free_tool_first_completed'/);
    expect(code).not.toMatch(/\b(DROP TABLE|ALTER TABLE|GRANT|POLICY)\b/i);
  });
});
