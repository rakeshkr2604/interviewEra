import { NextResponse } from 'next/server';
import {
  isDebugRoutesEnabled,
  redactSecretPrefix,
  supabaseJwtProjectRef,
  supabaseProjectRefFromUrl,
  supabaseServiceKeyFormat,
} from '@/lib/debug/upload-diagnostics';
import { requireDebugAdminAccess } from '@/lib/debug/require-debug-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Env shape check without leaking full secrets.
 * Requires IE_DEBUG_ROUTES=1 + platform admin.
 */
export async function GET(): Promise<NextResponse> {
  const gate = await requireDebugAdminAccess();
  if (gate.error) return gate.error;
  const admin = gate.admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const refFromUrl = supabaseProjectRefFromUrl(url);
  const anonRef = supabaseJwtProjectRef(anon);
  const serviceKeyFmt = supabaseServiceKeyFormat(service);
  // JWT ref cross-validation only applies to legacy eyJ keys; sb_secret_ keys are opaque.
  const serviceRef = serviceKeyFmt === 'jwt' ? supabaseJwtProjectRef(service) : null;
  const keysMatchProjectUrl =
    refFromUrl != null &&
    anonRef === refFromUrl &&
    (serviceKeyFmt === 'secret' || serviceRef === refFromUrl);

  return NextResponse.json({
    ok: true,
    runtime: 'nodejs',
    node: process.version,
    vercelRegion: process.env.VERCEL_REGION ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    debugRoutesEnabled: isDebugRoutesEnabled(),
    userIdPrefix: admin.id.slice(0, 8),
    supabaseUrl: url ? 'present' : 'missing',
    supabaseUrlHostPrefix: url ? new URL(url).hostname.slice(0, 24) : null,
    projectRefFromUrl: refFromUrl,
    anonKey: anon ? 'present' : 'missing',
    anonKeyPrefix: redactSecretPrefix(anon, 15),
    anonJwtRef: anonRef,
    serviceRoleKey: service ? 'present' : 'missing',
    serviceKeyFormat: serviceKeyFmt,
    serviceKeyPrefix: redactSecretPrefix(service, 15),
    serviceJwtRef: serviceRef,
    jwtRefMatchesUrl: keysMatchProjectUrl,
    openaiKey: process.env.OPENAI_API_KEY?.trim() ? 'present' : 'missing',
  });
}
