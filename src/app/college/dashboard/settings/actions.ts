'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateOrgProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated.' };

  const name = (formData.get('name') as string | null)?.trim();

  if (!name || name.length < 2) {
    return { error: 'Organization name must be at least 2 characters.' };
  }

  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from('campus_organizations')
    .update({ name })
    .eq('admin_user_id', user.id);

  if (error) {
    return { error: `Failed to update: ${error.message}` };
  }

  revalidatePath('/college/dashboard', 'layout');
  return { success: true };
}
