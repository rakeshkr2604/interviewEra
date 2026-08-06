import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { HiringOrg } from './types';

export interface HiringAuthContext {
  userId: string;
  org: HiringOrg;
}

export async function requireHiringAuth(): Promise<HiringAuthContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: org } = await serviceClient
    .from('hiring_organizations')
    .select('id, name, admin_user_id')
    .eq('admin_user_id', user.id)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: 'Hiring workspace not found' }, { status: 404 });
  }

  return {
    userId: user.id,
    org: {
      id: org.id,
      name: org.name,
      adminUserId: org.admin_user_id,
    },
  };
}

export function isHiringAuthError(
  result: HiringAuthContext | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
