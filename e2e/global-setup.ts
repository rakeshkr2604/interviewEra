import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const AUTH_DIR = join(process.cwd(), 'e2e', '.auth');
const STORAGE_PATH = join(AUTH_DIR, 'user.json');
const READY_PATH = join(AUTH_DIR, 'ready');

function supabaseAuthCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  mkdirSync(AUTH_DIR, { recursive: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const PORT = process.env.PLAYWRIGHT_PORT ?? '3000';
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

  if (!url || !serviceKey || !anonKey || serviceKey.includes('placeholder')) {
    writeFileSync(READY_PATH, '0');
    return;
  }

  const email = process.env.E2E_TEST_EMAIL?.trim() ?? `e2e-a11y+${Date.now()}@interviewera-mail.test`;
  const password = process.env.E2E_TEST_PASSWORD?.trim() ?? 'E2eA11yPass1!';

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!process.env.E2E_TEST_EMAIL) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error && !error.message.toLowerCase().includes('already')) {
      writeFileSync(READY_PATH, '0');
      console.warn('[e2e setup] createUser failed:', error.message);
      return;
    }
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) {
    writeFileSync(READY_PATH, '0');
    console.warn('[e2e setup] signIn failed:', signInError?.message);
    return;
  }

  const cookieName = supabaseAuthCookieName(url);
  const cookieValue = encodeURIComponent(JSON.stringify(signIn.session));
  const baseHost = new URL(baseURL).hostname;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: baseHost,
      path: '/',
      httpOnly: false,
      secure: baseURL.startsWith('https'),
      sameSite: 'Lax',
    },
  ]);
  await context.storageState({ path: STORAGE_PATH });
  await browser.close();

  writeFileSync(READY_PATH, '1');
}
