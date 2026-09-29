import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadSelectedE2eEnvironment } from './helpers/e2e-environment';
import { resolvePlaywrightBaseUrl } from '../src/lib/e2e/playwright-base-url';
import { isNonMutatingE2eTarget, resolveE2eSupabaseTarget } from '../src/lib/e2e/target-guard';
import {
  createE2eUser,
  ensurePersistentE2eUser,
  writeEphemeralUserRecord,
} from '../src/lib/e2e/user-lifecycle';

const AUTH_DIR = join(process.cwd(), 'e2e', '.auth');
const STORAGE_PATH = join(AUTH_DIR, 'user.json');
const READY_PATH = join(AUTH_DIR, 'ready');

function supabaseAuthCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  loadSelectedE2eEnvironment();
  mkdirSync(AUTH_DIR, { recursive: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const baseURL = resolvePlaywrightBaseUrl(process.env);
  const target = resolveE2eSupabaseTarget(url);

  if (
    isNonMutatingE2eTarget(target) ||
    !url ||
    !serviceKey ||
    !anonKey ||
    serviceKey.includes('placeholder')
  ) {
    writeFileSync(READY_PATH, '0');
    return;
  }

  const persistentEmail = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim() ?? 'E2eA11yPass1!';

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let email: string;
  try {
    if (persistentEmail) {
      const persistent = await ensurePersistentE2eUser(admin, {
        email: persistentEmail,
        password,
        userMetadata: { name: 'E2E Persistent' },
      });
      email = persistent.email;
    } else {
      const created = await createE2eUser(admin, {
        emailLocalPrefix: `e2e-a11y+${Date.now()}`,
        password,
        userMetadata: { name: 'E2E A11y' },
      });
      writeEphemeralUserRecord(created);
      email = created.email;
    }
  } catch (error) {
    writeFileSync(READY_PATH, '0');
    console.warn(
      '[e2e setup] user bootstrap failed:',
      error instanceof Error ? error.message : error,
    );
    return;
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
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
