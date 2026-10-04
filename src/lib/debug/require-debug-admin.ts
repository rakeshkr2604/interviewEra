/**
 * Gate for /api/debug/* — flag + platform admin (not any logged-in user).
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin, type AdminResult } from '@/lib/admin/auth';
import { isDebugRoutesEnabled } from '@/lib/debug/upload-diagnostics';

export async function requireDebugAdminAccess(): Promise<AdminResult | { admin: null; error: NextResponse }> {
  if (!isDebugRoutesEnabled()) {
    return { admin: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return requirePlatformAdmin();
}
