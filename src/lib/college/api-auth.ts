import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import { hasCampusPermission, resolveCampusRole } from './rbac';
import type { CampusOrg, CampusPermission, CampusRole } from './types';

export interface CampusAuthContext {
  userId: string;
  org: CampusOrg;
  role: NonNullable<ReturnType<typeof resolveCampusRole>>;
}

export async function requireCampusAuth(
  permission?: CampusPermission
): Promise<CampusAuthContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  let role: CampusRole | null = resolveCampusRole(profile?.plan_tier);
  if (!role && (await isPlatformAdminUser(user.id, user.email))) {
    role = 'campus_admin';
  }
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (permission && !hasCampusPermission(role, permission)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count, admin_user_id')
    .eq('admin_user_id', user.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Campus organization not found' }, { status: 404 });
  }

  return {
    userId: user.id,
    org: {
      id: org.id,
      name: org.name,
      seatCount: org.seat_count,
      adminUserId: org.admin_user_id,
    },
    role,
  };
}

export async function requireCampusOrgAccess(
  userId: string,
  collegeId: string
): Promise<{ org: CampusOrg } | null> {
  const serviceClient = createServiceClient();

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name, seat_count, admin_user_id')
    .eq('id', collegeId)
    .eq('admin_user_id', userId)
    .single();

  if (!org) return null;

  return {
    org: {
      id: org.id,
      name: org.name,
      seatCount: org.seat_count,
      adminUserId: org.admin_user_id,
    },
  };
}

export function isAuthError(result: CampusAuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
