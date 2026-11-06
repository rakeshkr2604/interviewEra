import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountProfilePatchSchema } from '@/lib/validations/schemas';

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = accountProfilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const { name, phoneNumber } = parsed.data;

    if (name !== undefined) {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, name },
      });

      if (metaErr) {
        console.error('[account/profile] auth.updateUser:', metaErr.message);
        return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
      }
    }

    const updatePayload: Record<string, string> = {};
    if (name !== undefined) updatePayload.name = name;
    if (phoneNumber !== undefined) updatePayload.phone_number = phoneNumber;

    const { error: dbErr } = await supabase.from('users').update(updatePayload).eq('id', user.id);

    if (dbErr) {
      console.error('[account/profile] users.update:', dbErr.message);
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, name, phoneNumber });
  } catch (err) {
    console.error('[account/profile] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
