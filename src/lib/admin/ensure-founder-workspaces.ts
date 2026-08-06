/**
 * Ensure platform admins have Campus + Hiring orgs so workspace switcher links work.
 * Idempotent — never duplicates; service-role only.
 */

import { createServiceClient } from '@/lib/supabase/server';

const FOUNDER_CAMPUS_NAME = 'InterviewEra Founder Campus';
const FOUNDER_HIRING_NAME = 'InterviewEra Founder Hiring';

export async function ensurePlatformAdminCampusOrg(userId: string): Promise<{
  id: string;
  name: string;
}> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', userId)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  const { data: inserted, error } = await service
    .from('campus_organizations')
    .insert({
      name: FOUNDER_CAMPUS_NAME,
      admin_user_id: userId,
      seat_count: 50,
      plan_start: new Date().toISOString().split('T')[0],
      verification_status: 'approved',
    })
    .select('id, name')
    .single();

  if (error || !inserted) {
    throw new Error(`[ensure-founder-workspaces] campus org failed: ${error?.message ?? 'unknown'}`);
  }

  await service.from('users').update({ plan_tier: 'campus_admin' }).eq('id', userId);

  return { id: inserted.id, name: inserted.name };
}

export async function ensurePlatformAdminHiringOrg(userId: string): Promise<{
  id: string;
  name: string;
}> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from('hiring_organizations')
    .select('id, name')
    .eq('admin_user_id', userId)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  const { data: inserted, error } = await service
    .from('hiring_organizations')
    .insert({
      name: FOUNDER_HIRING_NAME,
      admin_user_id: userId,
      company_size: 'founder',
    })
    .select('id, name')
    .single();

  if (error || !inserted) {
    throw new Error(`[ensure-founder-workspaces] hiring org failed: ${error?.message ?? 'unknown'}`);
  }

  return { id: inserted.id, name: inserted.name };
}
