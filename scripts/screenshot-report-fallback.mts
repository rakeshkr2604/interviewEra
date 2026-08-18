import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';
import { assertE2eSupabaseTargetNotProduction } from '../src/lib/e2e/target-guard';

config({ path: join(process.cwd(), '.env.local') });

assertE2eSupabaseTargetNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});
const email = 'script-report-live+1784295718506@interviewera-mail.test';
const password = 'ScriptReportLive1!';
const { data, error } = await anon.auth.signInWithPassword({ email, password });
if (error || !data.session) throw error ?? new Error('signin');

const ref = new URL(url).hostname.split('.')[0];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  {
    name: `sb-${ref}-auth-token`,
    value: encodeURIComponent(JSON.stringify(data.session)),
    domain: 'localhost',
    path: '/',
    sameSite: 'Lax',
  },
]);
const page = await ctx.newPage();
await page.goto(
  'http://localhost:3000/report/script/cfdd8337-0537-4312-bccc-d2decb22453c',
  { waitUntil: 'domcontentloaded', timeout: 120000 },
);
await page.waitForTimeout(4000);
const text = await page.locator('[data-testid="script-report-assessment"]').textContent();
const out = join(process.cwd(), '.voice-verify-out/script-report-live/03-synthesis-fallback.png');
await page.screenshot({ path: out, fullPage: true });
const line = JSON.stringify({
  t: new Date().toISOString(),
  msg: 'FALLBACK_UI_RELOAD',
  data: { assessmentPreview: text?.slice(0, 320), screenshot: out },
});
console.log(line);
appendFileSync(join(process.cwd(), '.voice-verify-out/script-report-live/evidence.jsonl'), `\n${line}`);
await browser.close();
