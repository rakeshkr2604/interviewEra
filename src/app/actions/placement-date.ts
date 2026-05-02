'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface PlacementDateState {
  success: boolean;
  error: string | null;
}

const schema = z.object({
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year').refine((v) => {
    const y = parseInt(v, 10);
    const current = new Date().getFullYear();
    return y >= current && y <= current + 3;
  }, 'Year must be current year or up to 3 years ahead'),
});

export async function savePlacementDate(
  _prevState: PlacementDateState,
  formData: FormData,
): Promise<PlacementDateState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const raw = {
    month: formData.get('month') as string,
    year: formData.get('year') as string,
  };

  const validation = schema.safeParse(raw);
  if (!validation.success) {
    return { success: false, error: 'Please select a valid month and year.' };
  }

  // Store as first day of the chosen month (DATE type in Postgres)
  const placementDate = `${validation.data.year}-${validation.data.month}-01`;

  const { error } = await supabase
    .from('users')
    .update({ placement_date: placementDate })
    .eq('id', user.id);

  if (error) {
    console.error('[placement-date]', error);
    return { success: false, error: 'Failed to save. Please try again.' };
  }

  revalidatePath('/dashboard');
  return { success: true, error: null };
}
