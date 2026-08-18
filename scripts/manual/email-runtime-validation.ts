/**
 * Runtime email lifecycle validation — hits local dev server and Supabase.
 * Usage: npx tsx scripts/email-runtime-validation.ts [--base-url http://localhost:3001]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { assertE2eSupabaseTargetNotProduction } from '../../src/lib/e2e/target-guard';
import { destroyE2eUser, markE2eUser } from '../../src/lib/e2e/user-lifecycle';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1]
  ?? process.env.RUNTIME_VALIDATION_BASE_URL
  ?? 'http://localhost:3001';

const RUN_ID = Date.now();
const TEST_EMAIL = `runtime-qa+${RUN_ID}@interviewera-mail.test`;
const TEST_PASSWORD = 'RuntimeQa1!';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT_EXECUTED';
  httpStatus?: number;
  response?: unknown;
  dbEvidence?: unknown;
  logSnippet?: string;
  notes?: string;
  reproduction?: string;
}

const results: TestResult[] = [];

function record(r: TestResult): void {
  results.push(r);
  const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
  console.log(`${icon} [${r.status}] ${r.id}: ${r.name}`);
  if (r.notes) console.log(`    ${r.notes}`);
}

async function fetchJson(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown; raw: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    /* plain text */
  }
  return { status: res.status, body, raw };
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function supabaseAuthCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

function sessionCookieHeader(
  supabaseUrl: string,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: unknown;
  },
): string {
  const name = supabaseAuthCookieName(supabaseUrl);
  const value = encodeURIComponent(JSON.stringify(session));
  return `${name}=${value}`;
}

async function signInAndGetCookie(email: string, password: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = anonSupabase();
  if (!url || !anon) return null;

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return sessionCookieHeader(url, data.session);
}

async function postWelcomeWithCookie(cookie: string): Promise<{ status: number; body: unknown; raw: string }> {
  const res = await fetch(`${BASE_URL}/api/email/welcome`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
  });
  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    /* plain text */
  }
  return { status: res.status, body, raw };
}

async function main(): Promise<number> {
  assertE2eSupabaseTargetNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const createdUserIds: string[] = [];
  try {
  console.log(`\nEmail Runtime Validation — ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test email: ${TEST_EMAIL}\n`);

  const envPresent = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
    CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
    UNSUBSCRIBE_SECRET: Boolean(process.env.UNSUBSCRIBE_SECRET?.trim()),
  };
  console.log('Env presence:', envPresent);

  // T0: Health
  try {
    const health = await fetchJson('/api/health');
    record({
      id: 'T0',
      name: 'API health + DB connectivity',
      status: health.status === 200 && (health.body as { db?: string })?.db === 'connected' ? 'PASS' : 'FAIL',
      httpStatus: health.status,
      response: health.body,
      reproduction: `curl ${BASE_URL}/api/health`,
    });
  } catch (e) {
    record({
      id: 'T0',
      name: 'API health + DB connectivity',
      status: 'FAIL',
      notes: e instanceof Error ? e.message : String(e),
      reproduction: 'Ensure npm run dev is running',
    });
  }

  const supabase = serviceSupabase();
  let lifecycleTableOk = false;
  if (supabase) {
    const { error } = await supabase.from('lifecycle_email_log').select('id').limit(1);
    lifecycleTableOk = !error;
    record({
      id: 'T0b',
      name: 'lifecycle_email_log table exists',
      status: lifecycleTableOk ? 'PASS' : 'FAIL',
      dbEvidence: error ? { error: error.message, code: error.code } : { ok: true },
      reproduction: 'Apply supabase/migrations/046_lifecycle_email_log.sql and 047_lifecycle_email_log_grants.sql',
    });
  } else {
    record({
      id: 'T0b',
      name: 'lifecycle_email_log table exists',
      status: 'NOT_EXECUTED',
      notes: 'Missing Supabase env',
    });
  }

  let signupUserId: string | undefined;

  // T1: Signup
  if (!envPresent.RESEND_API_KEY) {
    record({
      id: 'T1',
      name: 'Email signup → verification send',
      status: 'NOT_EXECUTED',
      notes: 'RESEND_API_KEY not set in .env.local',
      reproduction: 'POST /api/auth/signup',
    });
  } else {
    const signup = await fetchJson('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Runtime QA',
        next: '/dashboard',
      }),
    });
    signupUserId = (signup.body as { userId?: string })?.userId;
    if (signupUserId) {
      createdUserIds.push(signupUserId);
      if (supabase) {
        await markE2eUser(supabase, signupUserId).catch((err) => {
          console.warn('[email-runtime-validation] mark e2e metadata failed', err);
        });
      }
    }
    const pass = signup.status === 200 && (signup.body as { ok?: boolean })?.ok === true;
    record({
      id: 'T1',
      name: 'Email signup → verification send',
      status: pass ? 'PASS' : 'FAIL',
      httpStatus: signup.status,
      response: signup.body,
      reproduction: `POST ${BASE_URL}/api/auth/signup`,
      notes: pass ? `userId=${signupUserId?.slice(0, 8)}…` : undefined,
    });
  }

  // T2: Resend verification
  if (!envPresent.RESEND_API_KEY) {
    record({
      id: 'T2',
      name: 'Resend verification',
      status: 'NOT_EXECUTED',
      notes: 'RESEND_API_KEY not set',
    });
  } else if (!signupUserId) {
    record({
      id: 'T2',
      name: 'Resend verification',
      status: 'NOT_EXECUTED',
      notes: 'Signup did not create user',
    });
  } else {
    const resend = await fetchJson('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    record({
      id: 'T2',
      name: 'Resend verification',
      status: resend.status === 200 && (resend.body as { ok?: boolean })?.ok ? 'PASS' : 'FAIL',
      httpStatus: resend.status,
      response: resend.body,
      reproduction: `POST ${BASE_URL}/api/auth/resend-verification`,
    });
  }

  // T3: Welcome without session
  const welcomeUnauth = await fetchJson('/api/email/welcome', { method: 'POST' });
  record({
    id: 'T3a',
    name: 'Welcome API rejects unauthenticated',
    status: welcomeUnauth.status === 401 ? 'PASS' : 'FAIL',
    httpStatus: welcomeUnauth.status,
    response: welcomeUnauth.body,
    reproduction: `POST ${BASE_URL}/api/email/welcome (no cookies)`,
  });

  // T4: Password reset
  if (!envPresent.RESEND_API_KEY) {
    record({
      id: 'T4',
      name: 'Password reset',
      status: 'NOT_EXECUTED',
      notes: 'RESEND_API_KEY not set',
    });
  } else {
    const reset = await fetchJson('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    record({
      id: 'T4',
      name: 'Password reset',
      status: reset.status === 200 && (reset.body as { ok?: boolean })?.ok ? 'PASS' : 'FAIL',
      httpStatus: reset.status,
      response: reset.body,
      reproduction: `POST ${BASE_URL}/api/auth/forgot-password`,
    });
  }

  // T5: Weekly cron auth
  const cronNoAuth = await fetchJson('/api/cron/weekly-digest');
  record({
    id: 'T5a',
    name: 'Weekly cron rejects missing auth',
    status: cronNoAuth.status === 401 ? 'PASS' : 'FAIL',
    httpStatus: cronNoAuth.status,
    response: cronNoAuth.body,
  });

  if (!envPresent.CRON_SECRET) {
    record({
      id: 'T5b',
      name: 'Weekly cron execution',
      status: 'NOT_EXECUTED',
      notes: 'CRON_SECRET not set',
    });
  } else if (!envPresent.UNSUBSCRIBE_SECRET) {
    record({
      id: 'T5b',
      name: 'Weekly cron execution',
      status: 'NOT_EXECUTED',
      notes: 'UNSUBSCRIBE_SECRET not set (required by weekly-digest)',
    });
  } else {
    const cron = await fetch(`${BASE_URL}/api/cron/weekly-digest`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const cronBody = await cron.text();
    let parsed: unknown = cronBody;
    try {
      parsed = JSON.parse(cronBody);
    } catch {
      /* */
    }
    record({
      id: 'T5b',
      name: 'Weekly cron execution',
      status: cron.ok ? 'PASS' : 'FAIL',
      httpStatus: cron.status,
      response: parsed,
      reproduction: `GET ${BASE_URL}/api/cron/weekly-digest with Bearer CRON_SECRET`,
    });
  }

  // T6: Interview complete unauth
  const completeUnauth = await fetchJson('/api/interview/complete', {
    method: 'POST',
    body: JSON.stringify({ interviewId: '00000000-0000-0000-0000-000000000000' }),
  });
  record({
    id: 'T6a',
    name: 'Interview complete rejects unauthenticated',
    status: completeUnauth.status === 401 ? 'PASS' : 'FAIL',
    httpStatus: completeUnauth.status,
    response: completeUnauth.body,
  });

  // T7: Auth confirm page loads
  try {
    const confirmPage = await fetch(`${BASE_URL}/auth/confirm`);
    record({
      id: 'T7',
      name: 'Auth confirm page loads',
      status: confirmPage.status === 200 ? 'PASS' : 'FAIL',
      httpStatus: confirmPage.status,
      reproduction: `GET ${BASE_URL}/auth/confirm`,
    });
  } catch (e) {
    record({
      id: 'T7',
      name: 'Auth confirm page loads',
      status: 'FAIL',
      notes: e instanceof Error ? e.message : String(e),
    });
  }

  // T8 / T8b: Welcome via HTTP API (authenticated session cookie)
  if (supabase && signupUserId && envPresent.RESEND_API_KEY) {
    try {
      await supabase.auth.admin.updateUserById(signupUserId, { email_confirm: true });
      const cookie = await signInAndGetCookie(TEST_EMAIL, TEST_PASSWORD);
      if (!cookie) {
        record({
          id: 'T8',
          name: 'Welcome email via POST /api/email/welcome',
          status: 'FAIL',
          notes: 'Could not sign in test user after email_confirm',
          reproduction: 'signInWithPassword → POST /api/email/welcome with sb-*-auth-token cookie',
        });
        record({ id: 'T8b', name: 'Welcome idempotency (second send skipped)', status: 'NOT_EXECUTED', notes: 'T8 prerequisite failed' });
      } else {
        const welcome1 = await postWelcomeWithCookie(cookie);
        const welcomePass =
          welcome1.status === 200 &&
          (welcome1.body as { ok?: boolean; sent?: boolean; skipped?: boolean })?.ok === true &&
          ((welcome1.body as { sent?: boolean }).sent === true ||
            (welcome1.body as { skipped?: boolean }).skipped === true);

        const { data: logsAfterFirst } = await supabase
          .from('lifecycle_email_log')
          .select('template, status, idempotency_key, provider_message_id, sent_at')
          .eq('user_id', signupUserId)
          .order('sent_at', { ascending: false });

        record({
          id: 'T8',
          name: 'Welcome email via POST /api/email/welcome',
          status: welcomePass ? 'PASS' : 'FAIL',
          httpStatus: welcome1.status,
          response: welcome1.body,
          dbEvidence: logsAfterFirst,
          reproduction: 'email_confirm:true → signIn → POST /api/email/welcome',
          notes: (welcome1.body as { sent?: boolean })?.sent
            ? 'Welcome sent'
            : (welcome1.body as { skipped?: boolean })?.skipped
              ? 'Skipped (already sent)'
              : undefined,
        });

        const welcome2 = await postWelcomeWithCookie(cookie);
        const idempotencyPass =
          welcome2.status === 200 &&
          (welcome2.body as { skipped?: boolean })?.skipped === true &&
          (welcome2.body as { sent?: boolean })?.sent !== true;

        record({
          id: 'T8b',
          name: 'Welcome idempotency (second send skipped)',
          status: idempotencyPass ? 'PASS' : 'FAIL',
          httpStatus: welcome2.status,
          response: welcome2.body,
          notes: idempotencyPass
            ? 'Second call skipped as expected'
            : lifecycleTableOk
              ? 'Second call did not skip — idempotency broken'
              : 'Idempotency relies on lifecycle_email_log; grants missing so duplicate sends possible',
        });
      }
    } catch (e) {
      record({
        id: 'T8',
        name: 'Welcome email via POST /api/email/welcome',
        status: 'FAIL',
        notes: e instanceof Error ? e.message : String(e),
      });
      record({ id: 'T8b', name: 'Welcome idempotency', status: 'NOT_EXECUTED' });
    }
  } else {
    record({
      id: 'T8',
      name: 'Welcome email end-to-end',
      status: 'NOT_EXECUTED',
      notes: 'Requires successful signup + Supabase + Resend',
    });
    record({
      id: 'T8b',
      name: 'Welcome idempotency',
      status: 'NOT_EXECUTED',
    });
  }

  // T9: Interview completed email — full send requires authenticated in-progress interview E2E
  if (supabase && envPresent.RESEND_API_KEY) {
    const { data: interview } = await supabase
      .from('interviews')
      .select('id, user_id, status')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    record({
      id: 'T9',
      name: 'Interview completed email (full send on complete)',
      status: 'NOT_EXECUTED',
      notes: interview?.id
        ? `Completed interviews exist (sample id=${String(interview.id).slice(0, 8)}…) but re-trigger requires authenticated POST /api/interview/complete on a fresh in-progress session`
        : 'No completed interviews in database',
      reproduction:
        'Sign in → complete live interview → observe Resend + lifecycle_email_log row interview_completed:{id}',
    });
  } else {
    record({
      id: 'T9',
      name: 'Interview completed email',
      status: 'NOT_EXECUTED',
      notes: 'Missing prerequisites',
    });
  }

  // T10: Verification OTP flow (programmatic verifyOtp + welcome trigger)
  const t10Email = `runtime-t10+${RUN_ID}@interviewera-mail.test`;
  if (supabase && anonSupabase() && envPresent.RESEND_API_KEY) {
    try {
      const t10Signup = await fetchJson('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: t10Email,
          password: TEST_PASSWORD,
          name: 'Runtime QA Ten',
          next: '/dashboard',
        }),
      });
      if (t10Signup.status !== 200) {
        record({
          id: 'T10',
          name: 'Verification OTP → welcome (programmatic)',
          status: 'NOT_EXECUTED',
          notes: 'T10 signup failed',
          response: t10Signup.body,
        });
      } else {
        const t10UserId = (t10Signup.body as { userId?: string })?.userId;
        if (t10UserId) {
          createdUserIds.push(t10UserId);
          await markE2eUser(supabase, t10UserId).catch((err) => {
            console.warn('[email-runtime-validation] mark e2e metadata failed', err);
          });
        }
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: t10Email,
          password: TEST_PASSWORD,
          options: { redirectTo: `${BASE_URL}/auth/callback?next=%2Fdashboard` },
        });
        const tokenHash = linkData?.properties?.hashed_token?.trim();
        if (linkError || !tokenHash) {
          record({
            id: 'T10',
            name: 'Verification OTP → welcome (programmatic)',
            status: 'NOT_EXECUTED',
            notes: linkError?.message ?? 'No hashed_token from generateLink',
          });
        } else {
          const anon = anonSupabase()!;
          const { data: otpData, error: otpError } = await anon.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          });
          if (otpError || !otpData.session) {
            record({
              id: 'T10',
              name: 'Verification OTP → welcome (programmatic)',
              status: 'FAIL',
              notes: otpError?.message ?? 'verifyOtp returned no session',
            });
          } else {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
            const cookie = sessionCookieHeader(url, otpData.session);
            const confirmPage = await fetch(
              `${BASE_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=%2Fdashboard`,
            );
            const welcomeAfterOtp = await postWelcomeWithCookie(cookie);
            record({
              id: 'T10',
              name: 'Verification OTP → welcome (programmatic)',
              status:
                welcomeAfterOtp.status === 200 &&
                (welcomeAfterOtp.body as { ok?: boolean })?.ok === true
                  ? 'PASS'
                  : 'FAIL',
              httpStatus: welcomeAfterOtp.status,
              response: {
                verifyOtp: { userId: otpData.user?.id },
                welcome: welcomeAfterOtp.body,
                confirmPageStatus: confirmPage.status,
              },
              reproduction: 'generateLink → verifyOtp → POST /api/email/welcome (mirrors AuthConfirmClient)',
              notes: `confirm page HTTP ${confirmPage.status}; welcome sent=${(welcomeAfterOtp.body as { sent?: boolean })?.sent}`,
            });
          }
        }
      }
    } catch (e) {
      record({
        id: 'T10',
        name: 'Verification OTP → welcome (programmatic)',
        status: 'FAIL',
        notes: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    record({
      id: 'T10',
      name: 'Verification link click → verifyOtp → welcome (browser)',
      status: 'NOT_EXECUTED',
      notes: 'Missing Supabase or Resend env',
      reproduction: 'Manual: click verification email → observe /auth/confirm → dashboard + welcome in lifecycle_email_log',
    });
  }

  // T11: Google OAuth welcome
  record({
    id: 'T11',
    name: 'Google OAuth signup → welcome',
    status: 'NOT_EXECUTED',
    notes: 'Requires interactive Google OAuth in browser',
  });

  // T12: Product update regression
  record({
    id: 'T12',
    name: 'Product update campaign',
    status: 'NOT_EXECUTED',
    notes: 'Out of scope for runtime HTTP harness; use npm run send-product-update:dry-run separately',
  });

  const outPath = resolve(process.cwd(), 'scripts', 'email-runtime-validation-results.json');
  const summary = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    testEmail: TEST_EMAIL,
    envPresent,
    results,
    counts: {
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      notExecuted: results.filter((r) => r.status === 'NOT_EXECUTED').length,
    },
  };
  await import('fs').then((fs) => fs.writeFileSync(outPath, JSON.stringify(summary, null, 2)));
  console.log(`\nResults written to ${outPath}`);
  console.log(
    `Summary: ${summary.counts.pass} PASS, ${summary.counts.fail} FAIL, ${summary.counts.notExecuted} NOT_EXECUTED`,
  );
  return summary.counts.fail > 0 ? 1 : 0;
  } finally {
    const svc = serviceSupabase();
    if (svc) {
      for (const id of [...new Set(createdUserIds)]) {
        await destroyE2eUser(svc, id).catch((err) => {
          console.error('[email-runtime-validation] cleanup failed', id, err);
        });
      }
    }
  }
}

void main()
  .then((code) => {
    if (typeof code === 'number') process.exit(code);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
