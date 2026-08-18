import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

export const STAGING_SUPABASE_PROJECT_REF = 'iiowrzfwemaxytbykjrg';
export const PRODUCTION_SUPABASE_PROJECT_REF = 'plfuvgkycmxcyshrgpgv';

const STAGING_ENV_KEYS = [
  'APP_ENV',
  'EXPECTED_SUPABASE_PROJECT_REF',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'ALLOW_STAGING_EMAIL',
  'EMAIL_PROVIDER',
  'EMAIL_FROM',
  'SENDER_EMAIL_TRANSACTIONAL',
  'STAGING_APPROVED_EMAIL_FROM',
  'RESEND_API_KEY',
  'STAGING_LLM_MODE',
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'MISTRAL_API_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'DEEPGRAM_API_KEY',
  'DEEPGRAM_PROJECT_ID',
  'ELEVENLABS_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'CRON_SECRET',
  'SESSION_SIGNING_SECRET',
  'UNSUBSCRIBE_SECRET',
  'VIDEOSDK_AGENT_ID',
  'VIDEOSDK_AUTH_TOKEN',
  'VIDEOSDK_BRANCH_ID',
  'VIDEOSDK_SECRET',
  'VIDEOSDK_VERSION_ID',
  'VERCEL_AUTOMATION_BYPASS_SECRET',
  'VERCEL_OIDC_TOKEN',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
  'NEXT_PUBLIC_CLARITY_ID',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'PRODUCT_UPDATE_FROM',
  'PRODUCT_UPDATE_REPLY_TO',
  'PRODUCT_UPDATE_APP_URL',
  'E2E_TEST_EMAIL',
  'E2E_TEST_PASSWORD',
  'PLAYWRIGHT_BASE_URL',
] as const;

export type StagingEnvironment = Record<string, string | undefined>;

export type StagingEnvironmentSource =
  | { type: 'file'; path?: string; cwd?: string }
  | { type: 'injected'; env?: StagingEnvironment };

function required(env: StagingEnvironment, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`[staging-env] Missing required ${name}.`);
  }
  if (value.toLowerCase().includes('placeholder')) {
    throw new Error(`[staging-env] ${name} is still a placeholder.`);
  }
  return value;
}

export function parseSupabaseProjectRef(supabaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new Error('[staging-env] NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
  }

  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
  if (!match) {
    throw new Error(
      '[staging-env] NEXT_PUBLIC_SUPABASE_URL must use a <project-ref>.supabase.co host.',
    );
  }
  return match[1].toLowerCase();
}

function assertTestRazorpayKey(name: string, value: string): void {
  if (value.startsWith('rzp_live_')) {
    throw new Error(`[staging-env] ${name} is a live Razorpay key; staging refuses live payments.`);
  }
  if (!value.startsWith('rzp_test_')) {
    throw new Error(`[staging-env] ${name} must be a Razorpay test-mode key (rzp_test_*).`);
  }
}

function assertEmailSafety(env: StagingEnvironment): void {
  const allowEmail = env.ALLOW_STAGING_EMAIL?.trim() ?? 'false';
  if (allowEmail !== '1' && allowEmail !== 'false') {
    throw new Error('[staging-env] ALLOW_STAGING_EMAIL must be false or 1.');
  }

  if (allowEmail === 'false') {
    const configuredEmailSecrets = ['RESEND_API_KEY'].filter((name) => env[name]?.trim());
    if (configuredEmailSecrets.length > 0) {
      throw new Error(
        `[staging-env] Email is disabled but ${configuredEmailSecrets.join(', ')} is configured.`,
      );
    }
    return;
  }

  const provider = required(env, 'EMAIL_PROVIDER').toLowerCase();
  if (provider !== 'resend') {
    throw new Error('[staging-env] Staging email currently permits only the explicitly configured resend provider.');
  }

  required(env, 'RESEND_API_KEY');
  const approvedFrom = required(env, 'STAGING_APPROVED_EMAIL_FROM');
  const emailFrom = required(env, 'EMAIL_FROM');
  const transactionalFrom = required(env, 'SENDER_EMAIL_TRANSACTIONAL');
  if (emailFrom !== approvedFrom || transactionalFrom !== approvedFrom) {
    throw new Error(
      '[staging-env] EMAIL_FROM and SENDER_EMAIL_TRANSACTIONAL must match STAGING_APPROVED_EMAIL_FROM.',
    );
  }
}

function assertLlmSafety(env: StagingEnvironment): void {
  const mode = required(env, 'STAGING_LLM_MODE');
  if (mode === 'disabled') {
    if (env.OPENROUTER_API_KEY?.trim() || env.OPENAI_API_KEY?.trim()) {
      throw new Error('[staging-env] LLM mode is disabled but an LLM credential is configured.');
    }
    return;
  }
  if (mode !== 'enabled') {
    throw new Error('[staging-env] STAGING_LLM_MODE must be disabled or enabled.');
  }
  required(env, 'OPENROUTER_API_KEY');
}

/**
 * Narrow runtime isolation for mutating payment webhooks.
 *
 * - VERCEL_ENV=production with APP_ENV ≠ staging: allow (no EXPECTED_SUPABASE_PROJECT_REF).
 * - VERCEL_ENV=preview: fail closed unless APP_ENV=staging and the certified staging
 *   Supabase target is configured. Preview never passthroughs on a missing APP_ENV.
 * - APP_ENV=staging (any VERCEL_ENV, including local): fail closed unless configured
 *   Supabase URL is the certified staging project and EXPECTED_SUPABASE_PROJECT_REF matches.
 * - Local (VERCEL_ENV unset, APP_ENV unset): allow.
 *
 * Identity is derived from NEXT_PUBLIC_SUPABASE_URL via parseSupabaseProjectRef —
 * a caller-supplied expected ref alone is never trusted.
 *
 * Never log secrets; callers must only log the returned `code`.
 */
export type WebhookSupabaseIsolationResult =
  | { ok: true; mode: 'passthrough' | 'staging' }
  | { ok: false; code: string };

function evaluateStagingSupabaseTarget(env: StagingEnvironment): WebhookSupabaseIsolationResult {
  const expectedRaw = env.EXPECTED_SUPABASE_PROJECT_REF?.trim();
  if (!expectedRaw) {
    return { ok: false, code: 'missing_expected_supabase_project_ref' };
  }
  if (expectedRaw.toLowerCase().includes('placeholder')) {
    return { ok: false, code: 'placeholder_expected_supabase_project_ref' };
  }

  const expectedRef = expectedRaw.toLowerCase();
  if (expectedRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: 'expected_ref_is_production' };
  }
  if (expectedRef !== STAGING_SUPABASE_PROJECT_REF) {
    return { ok: false, code: 'expected_ref_not_certified_staging' };
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return { ok: false, code: 'missing_supabase_url' };
  }
  if (supabaseUrl.toLowerCase().includes('placeholder')) {
    return { ok: false, code: 'placeholder_supabase_url' };
  }

  let actualRef: string;
  try {
    actualRef = parseSupabaseProjectRef(supabaseUrl);
  } catch {
    return { ok: false, code: 'invalid_supabase_url' };
  }

  if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    return { ok: false, code: 'supabase_url_is_production' };
  }
  if (actualRef !== expectedRef) {
    return { ok: false, code: 'supabase_project_ref_mismatch' };
  }

  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRole) {
    return { ok: false, code: 'missing_service_role_key' };
  }
  if (serviceRole.toLowerCase().includes('placeholder')) {
    return { ok: false, code: 'placeholder_service_role_key' };
  }

  return { ok: true, mode: 'staging' };
}

export function evaluateWebhookSupabaseIsolation(
  env: StagingEnvironment = process.env,
): WebhookSupabaseIsolationResult {
  const vercelEnv = env.VERCEL_ENV?.trim();
  const appEnv = env.APP_ENV?.trim();
  const isStagingApp = appEnv === 'staging';

  if (vercelEnv === 'preview' && !isStagingApp) {
    return {
      ok: false,
      code: appEnv ? 'preview_app_env_not_staging' : 'preview_missing_app_env',
    };
  }

  if (!isStagingApp) {
    return { ok: true, mode: 'passthrough' };
  }

  return evaluateStagingSupabaseTarget(env);
}

export function assertSafeStagingEnvironment(env: StagingEnvironment): void {
  if (required(env, 'APP_ENV') !== 'staging') {
    throw new Error('[staging-env] APP_ENV must be staging.');
  }

  const expectedRef = required(env, 'EXPECTED_SUPABASE_PROJECT_REF').toLowerCase();
  if (expectedRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('[staging-env] Production Supabase project ref is forbidden.');
  }
  if (expectedRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(
      `[staging-env] EXPECTED_SUPABASE_PROJECT_REF must be ${STAGING_SUPABASE_PROJECT_REF}.`,
    );
  }

  const actualRef = parseSupabaseProjectRef(required(env, 'NEXT_PUBLIC_SUPABASE_URL'));
  if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('[staging-env] Production Supabase URL is forbidden.');
  }
  if (actualRef !== expectedRef) {
    throw new Error(
      `[staging-env] Supabase project ref mismatch: expected ${expectedRef}, got ${actualRef}.`,
    );
  }

  required(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  required(env, 'SUPABASE_SERVICE_ROLE_KEY');
  required(env, 'NEXT_PUBLIC_APP_URL');

  const serverRazorpayKey = required(env, 'RAZORPAY_KEY_ID');
  const publicRazorpayKey = required(env, 'NEXT_PUBLIC_RAZORPAY_KEY_ID');
  assertTestRazorpayKey('RAZORPAY_KEY_ID', serverRazorpayKey);
  assertTestRazorpayKey('NEXT_PUBLIC_RAZORPAY_KEY_ID', publicRazorpayKey);
  if (serverRazorpayKey !== publicRazorpayKey) {
    throw new Error('[staging-env] Razorpay public and server key IDs must match.');
  }
  required(env, 'RAZORPAY_KEY_SECRET');
  required(env, 'RAZORPAY_WEBHOOK_SECRET');

  assertEmailSafety(env);
  assertLlmSafety(env);
}

function environmentFromFile(path: string): StagingEnvironment {
  if (!existsSync(path)) {
    throw new Error(
      `[staging-env] Missing ${path}. Staging execution never falls back to .env.local.`,
    );
  }
  return parse(readFileSync(path));
}

export function loadSafeStagingEnvironment(
  source: StagingEnvironmentSource,
  target: NodeJS.ProcessEnv = process.env,
): StagingEnvironment {
  const loaded =
    source.type === 'file'
      ? environmentFromFile(resolve(source.cwd ?? process.cwd(), source.path ?? '.env.staging.local'))
      : { ...(source.env ?? target) };

  assertSafeStagingEnvironment(loaded);

  if (source.type === 'file') {
    for (const key of STAGING_ENV_KEYS) {
      // Next.js will still discover `.env.local` when its dev server starts.
      // Preserve an explicit empty value for absent staging keys so Next cannot
      // repopulate production-class credentials from that file.
      target[key] = loaded[key] ?? '';
    }
    Object.assign(target, loaded);
  }
  target.E2E_ENVIRONMENT = 'staging';
  return loaded;
}
