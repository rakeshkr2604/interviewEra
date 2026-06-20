import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/** Load `.env.local` (then `.env`) before Supabase / Resend clients initialize. */
export function loadCampaignEnv(): void {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(envPath)) continue;

    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const PRODUCTION_APP_URL = 'https://interviewera.com';

function isLocalOrDevUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    );
  } catch {
    return true;
  }
}

/**
 * Campaign emails must never link to localhost — always use production unless
 * PRODUCT_UPDATE_APP_URL is explicitly set to a non-local URL.
 */
export function getCampaignAppBaseUrl(): string {
  const explicit = process.env.PRODUCT_UPDATE_APP_URL?.trim();
  if (explicit && !isLocalOrDevUrl(explicit)) {
    return explicit.replace(/\/$/, '');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl && !isLocalOrDevUrl(appUrl)) {
    return appUrl.replace(/\/$/, '');
  }

  return PRODUCTION_APP_URL;
}

/** @deprecated Use getCampaignAppBaseUrl for campaign scripts. */
export function getAppBaseUrl(): string {
  return getCampaignAppBaseUrl();
}
