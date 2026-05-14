/**
 * Server-side base URL resolution for email links, invite URLs, and other
 * public-facing links generated on the server.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_APP_URL  — explicit override; skipped if it resolves to localhost
 *  2. VERCEL_URL           — auto-injected by Vercel on every deployment (no protocol)
 *  3. localhost:3000       — local development (NODE_ENV=development) only
 *  4. https://interviewera.com — production safety net
 *
 * This prevents localhost from ever leaking into production emails when
 * NEXT_PUBLIC_APP_URL is mistakenly set to http://localhost:3000 in Vercel's
 * project environment variables.
 */

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

export function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (appUrl && !isLocalhostUrl(appUrl)) {
    return appUrl;
  }

  // VERCEL_URL is set automatically on all Vercel deployments (preview + production).
  // It contains only the hostname (no protocol), e.g. "interviewera-git-main.vercel.app".
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === 'development') {
    return appUrl ?? 'http://localhost:3000';
  }

  return 'https://interviewera.com';
}
