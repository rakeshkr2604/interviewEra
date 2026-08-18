'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import { canAccessCampusDashboard } from '@/lib/college/rbac';

export async function updateOrgProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated.' };

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  const platformAdmin = await isPlatformAdminUser(user.id, user.email);
  if (!canAccessCampusDashboard(profile?.plan_tier) && !platformAdmin) {
    return { error: 'Forbidden.' };
  }

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, verification_status')
    .eq('admin_user_id', user.id)
    .single();

  if (!org) return { error: 'Campus organization not found.' };
  if (org.verification_status !== 'approved') {
    return { error: 'Campus organization is pending verification.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  const coordinatorName = (formData.get('coordinator_name') as string | null)?.trim() || null;
  const contactEmail = (formData.get('contact_email') as string | null)?.trim() || null;

  if (!name || name.length < 2) {
    return { error: 'Organization name must be at least 2 characters.' };
  }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: 'Contact email is invalid.' };
  }

  const { error } = await serviceClient
    .from('campus_organizations')
    .update({
      name,
      coordinator_name: coordinatorName,
      contact_email: contactEmail,
    })
    .eq('id', org.id);

  if (error) {
    return { error: `Failed to update: ${error.message}` };
  }

  revalidatePath('/college/dashboard', 'layout');
  return { success: true };
}
