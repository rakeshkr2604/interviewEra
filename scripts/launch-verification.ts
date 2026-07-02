/**
 * Production launch verification — checks env, health, crons, migrations readiness.
 * Usage: npx tsx scripts/launch-verification.ts [--base-url https://interviewera.com]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL =
  process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1] ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000';

interface Check {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail?: string;
}

const checks: Check[] = [];

function record(c: Check) {
  checks.push(c);
  const icon = c.status === 'PASS' ? '✓' : c.status === 'WARN' ? '!' : c.status === 'SKIP' ? '○' : '✗';
  console.log(`${icon} [${c.status}] ${c.id} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const raw = await res.text();
  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    /* plain */
  }
  return { status: res.status, body, raw };
}

async function main() {
  console.log(`\nInterviewEra Launch Verification — ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // A — Environment variables
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'CRON_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NEXT_PUBLIC_APP_URL',
    'FOUNDER_FEEDBACK_EMAIL',
    'ADMIN_EMAILS',
  ];
  for (const key of requiredEnv) {
    record({
      id: 'ENV',
      category: 'Environment',
      name: key,
      status: envPresent(key) ? 'PASS' : 'WARN',
      detail: envPresent(key) ? undefined : 'Not set locally — verify in Vercel',
    });
  }

  record({
    id: 'ENV-CAMPUS',
    category: 'Environment',
    name: 'CAMPUS_WORKSPACE_AUTO_APPROVE unset in production',
    status: process.env.CAMPUS_WORKSPACE_AUTO_APPROVE === 'true' ? 'FAIL' : 'PASS',
    detail:
      process.env.CAMPUS_WORKSPACE_AUTO_APPROVE === 'true'
        ? 'Must be unset/false in production'
        : undefined,
  });

  // B — Migrations
  const migrations = ['048_campus_workspace_completion.sql', '049_candidate_workspace.sql', '050_production_security_hardening.sql', '051_post_launch_growth.sql'];
  for (const m of migrations) {
    const path = resolve(process.cwd(), 'supabase/migrations', m);
    record({
      id: 'MIG',
      category: 'Database',
      name: `Migration ${m}`,
      status: existsSync(path) ? 'PASS' : 'FAIL',
    });
  }

  // C — Cron config
  const vercelJson = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
    crons?: { path: string; schedule: string }[];
  };
  const cronPaths = (vercelJson.crons ?? []).map((c) => c.path);
  for (const expected of [
    '/api/cron/health-snapshot',
    '/api/cron/daily-rollup',
    '/api/cron/plan-expiry',
    '/api/cron/weekly-digest',
    '/api/cron/feedback-retry',
  ]) {
    record({
      id: 'CRON',
      category: 'Cron',
      name: expected,
      status: cronPaths.includes(expected) ? 'PASS' : 'FAIL',
    });
  }

  // D — Health endpoint
  try {
    const health = await fetchJson('/api/health');
    const db = (health.body as { db?: string })?.db;
    record({
      id: 'HEALTH',
      category: 'Monitoring',
      name: 'GET /api/health',
      status: health.status === 200 && db === 'connected' ? 'PASS' : 'FAIL',
      detail: `HTTP ${health.status}, db=${db ?? 'unknown'}`,
    });
  } catch (e) {
    record({
      id: 'HEALTH',
      category: 'Monitoring',
      name: 'GET /api/health',
      status: 'FAIL',
      detail: e instanceof Error ? e.message : 'unreachable',
    });
  }

  // E — Cron auth (skip if no secret)
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    try {
      const snap = await fetchJson('/api/cron/health-snapshot', {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      record({
        id: 'CRON-AUTH',
        category: 'Cron',
        name: 'health-snapshot cron auth',
        status: snap.status === 200 ? 'PASS' : 'WARN',
        detail: `HTTP ${snap.status}`,
      });
    } catch {
      record({ id: 'CRON-AUTH', category: 'Cron', name: 'health-snapshot cron auth', status: 'SKIP', detail: 'Server unreachable' });
    }
  }

  const failed = checks.filter((c) => c.status === 'FAIL').length;
  const warned = checks.filter((c) => c.status === 'WARN').length;
  console.log(`\nSummary: ${checks.length} checks — ${failed} FAIL, ${warned} WARN`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
