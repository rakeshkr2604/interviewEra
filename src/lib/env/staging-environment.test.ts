import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertSafeStagingEnvironment,
  evaluateWebhookSupabaseIsolation,
  loadSafeStagingEnvironment,
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from './staging-environment';

function safeEnvironment(): Record<string, string> {
  return {
    APP_ENV: 'staging',
    EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'staging-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
    NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
    RAZORPAY_KEY_ID: 'rzp_test_staging',
    NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_staging',
    RAZORPAY_KEY_SECRET: 'staging-test-secret',
    RAZORPAY_WEBHOOK_SECRET: 'staging-test-webhook-secret',
    ALLOW_STAGING_EMAIL: 'false',
    STAGING_LLM_MODE: 'disabled',
  };
}

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('staging environment guard', () => {
  it('accepts the certified staging URL and expected ref', () => {
    expect(() => assertSafeStagingEnvironment(safeEnvironment())).not.toThrow();
  });

  it('rejects the production Supabase URL', () => {
    const env = safeEnvironment();
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://plfuvgkycmxcyshrgpgv.supabase.co';
    expect(() => assertSafeStagingEnvironment(env)).toThrow(/Production Supabase URL/);
  });

  it('rejects a different Supabase project ref', () => {
    const env = safeEnvironment();
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://differentprojectref.supabase.co';
    expect(() => assertSafeStagingEnvironment(env)).toThrow(/project ref mismatch/);
  });

  it('rejects missing APP_ENV', () => {
    const env = safeEnvironment();
    delete env.APP_ENV;
    expect(() => assertSafeStagingEnvironment(env)).toThrow(/Missing required APP_ENV/);
  });

  it('rejects APP_ENV=production', () => {
    expect(() =>
      assertSafeStagingEnvironment({ ...safeEnvironment(), APP_ENV: 'production' }),
    ).toThrow(/APP_ENV must be staging/);
  });

  it('rejects a missing expected ref', () => {
    const env = safeEnvironment();
    delete env.EXPECTED_SUPABASE_PROJECT_REF;
    expect(() => assertSafeStagingEnvironment(env)).toThrow(
      /Missing required EXPECTED_SUPABASE_PROJECT_REF/,
    );
  });

  it('rejects a live Razorpay key', () => {
    const env = safeEnvironment();
    env.RAZORPAY_KEY_ID = 'rzp_live_forbidden';
    expect(() => assertSafeStagingEnvironment(env)).toThrow(/live Razorpay key/);
  });

  it('accepts matching Razorpay test keys', () => {
    expect(() => assertSafeStagingEnvironment(safeEnvironment())).not.toThrow();
  });

  it('accepts staging email disabled without provider credentials', () => {
    expect(() =>
      assertSafeStagingEnvironment({ ...safeEnvironment(), ALLOW_STAGING_EMAIL: 'false' }),
    ).not.toThrow();
  });

  it('rejects enabled staging email without approved configuration', () => {
    expect(() =>
      assertSafeStagingEnvironment({ ...safeEnvironment(), ALLOW_STAGING_EMAIL: '1' }),
    ).toThrow(/Missing required EMAIL_PROVIDER/);
  });

  it('fails closed when the staging environment file is absent', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'interviewera-staging-env-'));
    temporaryDirectories.push(cwd);
    expect(() =>
      loadSafeStagingEnvironment({ type: 'file', cwd }, {}),
    ).toThrow(/Missing .*\.env\.staging\.local/);
  });

  it('never falls back to .env.local', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'interviewera-staging-env-'));
    temporaryDirectories.push(cwd);
    const localEnv = Object.entries(safeEnvironment())
      .map(([name, value]) => `${name}=${value}`)
      .join('\n');
    writeFileSync(join(cwd, '.env.local'), localEnv);

    expect(() =>
      loadSafeStagingEnvironment({ type: 'file', cwd }, {}),
    ).toThrow(/never falls back to \.env\.local/);
  });

  it('shadows production-class credentials that are absent from the staging file', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'interviewera-staging-env-'));
    temporaryDirectories.push(cwd);
    const stagingEnv = Object.entries(safeEnvironment())
      .map(([name, value]) => `${name}=${value}`)
      .join('\n');
    writeFileSync(join(cwd, '.env.staging.local'), stagingEnv);
    const target = {
      RESEND_API_KEY: 'production-email-key',
      OPENROUTER_API_KEY: 'production-llm-key',
      SUPABASE_ACCESS_TOKEN: 'production-management-token',
    };

    loadSafeStagingEnvironment({ type: 'file', cwd }, target);

    expect(target.RESEND_API_KEY).toBe('');
    expect(target.OPENROUTER_API_KEY).toBe('');
    expect(target.SUPABASE_ACCESS_TOKEN).toBe('');
  });
});

describe('evaluateWebhookSupabaseIsolation', () => {
  it('passthrough when APP_ENV and VERCEL_ENV are unset (local)', () => {
    expect(evaluateWebhookSupabaseIsolation({})).toEqual({
      ok: true,
      mode: 'passthrough',
    });
  });

  it('passthrough when VERCEL_ENV=production and APP_ENV is missing', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: true, mode: 'passthrough' });
  });

  it('passthrough when VERCEL_ENV=production and APP_ENV=production', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'production',
        APP_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: true, mode: 'passthrough' });
  });

  it('passthrough when APP_ENV is production without VERCEL_ENV', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: true, mode: 'passthrough' });
  });

  it('rejects VERCEL_ENV=preview when APP_ENV is missing', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'preview',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: false, code: 'preview_missing_app_env' });
  });

  it('rejects VERCEL_ENV=preview when APP_ENV=production', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'preview',
        APP_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: false, code: 'preview_app_env_not_staging' });
  });

  it('allows staging with certified URL + expected ref', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: true, mode: 'staging' });
  });

  it('allows preview when APP_ENV=staging and certified staging target is set', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'preview',
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: true, mode: 'staging' });
  });

  it('rejects staging with production Supabase URL', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'supabase_url_is_production' });
  });

  it('rejects preview + staging when Supabase URL is production', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        VERCEL_ENV: 'preview',
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'supabase_url_is_production' });
  });

  it('rejects staging with wrong project ref', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: 'https://differentprojectref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'supabase_project_ref_mismatch' });
  });

  it('rejects staging when expected ref is missing', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'missing_expected_supabase_project_ref' });
  });

  it('rejects staging when expected ref is production', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: PRODUCTION_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'expected_ref_is_production' });
  });

  it('rejects staging with missing or invalid Supabase URL', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'missing_supabase_url' });

    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
        SUPABASE_SERVICE_ROLE_KEY: 'staging-service-role-key',
      }),
    ).toEqual({ ok: false, code: 'invalid_supabase_url' });
  });

  it('rejects staging when service role key is missing', () => {
    expect(
      evaluateWebhookSupabaseIsolation({
        APP_ENV: 'staging',
        EXPECTED_SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
      }),
    ).toEqual({ ok: false, code: 'missing_service_role_key' });
  });
});
