import { afterEach, describe, expect, it } from 'vitest';
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from '@/lib/env/staging-environment';
import {
  assertE2eSupabaseTargetNotProduction,
  formatE2eSupabaseTarget,
  isNonMutatingE2eTarget,
  resolveE2eSupabaseTarget,
} from '@/lib/e2e/target-guard';

describe('resolveE2eSupabaseTarget', () => {
  it('treats missing URL as missing', () => {
    expect(resolveE2eSupabaseTarget(undefined)).toEqual({ kind: 'missing' });
    expect(resolveE2eSupabaseTarget('  ')).toEqual({ kind: 'missing' });
  });

  it('treats placeholder hosts as non-mutating', () => {
    const target = resolveE2eSupabaseTarget('https://placeholder.supabase.co');
    expect(target.kind).toBe('placeholder');
    expect(isNonMutatingE2eTarget(target)).toBe(true);
  });

  it('identifies the production project', () => {
    const target = resolveE2eSupabaseTarget(
      `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    );
    expect(target).toEqual({
      kind: 'production',
      projectRef: PRODUCTION_SUPABASE_PROJECT_REF,
      host: `${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    });
  });

  it('identifies the certified staging project', () => {
    const target = resolveE2eSupabaseTarget(
      `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
    );
    expect(target).toEqual({
      kind: 'supabase',
      projectRef: STAGING_SUPABASE_PROJECT_REF,
      host: `${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
      isStaging: true,
    });
  });

  it('allows a non-supabase local host', () => {
    expect(resolveE2eSupabaseTarget('http://127.0.0.1:54321')).toEqual({
      kind: 'local',
      host: '127.0.0.1:54321',
    });
  });
});

describe('assertE2eSupabaseTargetNotProduction', () => {
  const logs: string[] = [];
  afterEach(() => {
    logs.length = 0;
  });

  it('logs and throws on production', () => {
    expect(() =>
      assertE2eSupabaseTargetNotProduction(
        `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
        (m) => logs.push(m),
      ),
    ).toThrow(/Refusing to run: target is production/);
    expect(logs[0]).toContain('kind=production');
    expect(logs[0]).toContain(PRODUCTION_SUPABASE_PROJECT_REF);
  });

  it('logs and allows staging', () => {
    const target = assertE2eSupabaseTargetNotProduction(
      `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
      (m) => logs.push(m),
    );
    expect(target.kind).toBe('supabase');
    expect(logs[0]).toContain(`project_ref=${STAGING_SUPABASE_PROJECT_REF}`);
    expect(logs[0]).toContain('staging=true');
  });

  it('logs and allows placeholder', () => {
    expect(() =>
      assertE2eSupabaseTargetNotProduction(
        'https://placeholder.supabase.co',
        (m) => logs.push(m),
      ),
    ).not.toThrow();
    expect(logs[0]).toContain('kind=placeholder');
  });
});

describe('formatE2eSupabaseTarget', () => {
  it('never includes service-role or anon key material', () => {
    const formatted = formatE2eSupabaseTarget({
      kind: 'supabase',
      projectRef: STAGING_SUPABASE_PROJECT_REF,
      host: `${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
      isStaging: true,
    });
    expect(formatted.toLowerCase()).not.toContain('service');
    expect(formatted.toLowerCase()).not.toContain('anon');
    expect(formatted.toLowerCase()).not.toContain('eyj');
  });
});
