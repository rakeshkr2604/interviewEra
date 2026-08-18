/**
 * Fail-closed guard: E2E / live-verify scripts must never target production Supabase.
 * Logs the resolved project identity. Never logs secrets.
 */

import { isPlaceholderValue } from '../redis/client';
import {
  parseSupabaseProjectRef,
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from '../env/staging-environment';

export type E2eSupabaseTarget =
  | { kind: 'missing' }
  | { kind: 'placeholder'; host: string }
  | { kind: 'local'; host: string }
  | { kind: 'supabase'; projectRef: string; host: string; isStaging: boolean }
  | { kind: 'production'; projectRef: string; host: string };

const LOG_PREFIX = '[e2e-target]';

function hostOf(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return '(invalid-url)';
  }
}

export function resolveE2eSupabaseTarget(
  supabaseUrl: string | undefined,
): E2eSupabaseTarget {
  const raw = supabaseUrl?.trim();
  if (!raw) return { kind: 'missing' };

  const host = hostOf(raw);
  if (isPlaceholderValue(raw) || raw.toLowerCase().includes('placeholder')) {
    return { kind: 'placeholder', host };
  }

  try {
    const projectRef = parseSupabaseProjectRef(raw);
    if (projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      return { kind: 'production', projectRef, host };
    }
    return {
      kind: 'supabase',
      projectRef,
      host,
      isStaging: projectRef === STAGING_SUPABASE_PROJECT_REF,
    };
  } catch {
    return { kind: 'local', host };
  }
}

export function formatE2eSupabaseTarget(target: E2eSupabaseTarget): string {
  switch (target.kind) {
    case 'missing':
      return `${LOG_PREFIX} kind=missing project_ref=(none)`;
    case 'placeholder':
      return `${LOG_PREFIX} kind=placeholder project_ref=(placeholder) host=${target.host}`;
    case 'local':
      return `${LOG_PREFIX} kind=local project_ref=(non-supabase-host) host=${target.host}`;
    case 'supabase':
      return `${LOG_PREFIX} kind=supabase project_ref=${target.projectRef} staging=${target.isStaging} host=${target.host}`;
    case 'production':
      return `${LOG_PREFIX} kind=production project_ref=${target.projectRef} host=${target.host}`;
  }
}

export function logE2eSupabaseTarget(
  supabaseUrl: string | undefined,
  log: (message: string) => void = console.log,
): E2eSupabaseTarget {
  const target = resolveE2eSupabaseTarget(supabaseUrl);
  log(formatE2eSupabaseTarget(target));
  return target;
}

/**
 * Throws immediately when NEXT_PUBLIC_SUPABASE_URL is the production project.
 * Placeholder / missing / local / staging / other hosted refs are allowed.
 */
export function assertE2eSupabaseTargetNotProduction(
  supabaseUrl: string | undefined,
  log: (message: string) => void = console.log,
): E2eSupabaseTarget {
  const target = logE2eSupabaseTarget(supabaseUrl, log);
  if (target.kind === 'production') {
    throw new Error(
      `${LOG_PREFIX} Refusing to run: target is production Supabase (${PRODUCTION_SUPABASE_PROJECT_REF}). ` +
        'E2E and live-verify scripts must use staging, local, or placeholder credentials.',
    );
  }
  return target;
}

export function isNonMutatingE2eTarget(target: E2eSupabaseTarget): boolean {
  return target.kind === 'missing' || target.kind === 'placeholder';
}
