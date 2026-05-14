import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
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
      .from('campus_organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { description, type, targetValue, dueDate, mandatory } = await request.json();

    if (!description || !type || targetValue === undefined || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['sessions', 'tier', 'score'].includes(type)) {
      return NextResponse.json({ error: 'Invalid deadline type' }, { status: 400 });
    }

    const numTarget = parseFloat(targetValue);
    if (isNaN(numTarget)) {
      return NextResponse.json({ error: 'Invalid target value' }, { status: 400 });
    }

    const { error: insertError } = await serviceClient.from('college_deadlines').insert({
      college_id: org.id,
      deadline_type: type,
      target_value: numTarget,
      due_date: dueDate,
      description,
      mandatory: mandatory ?? true,
    });

    if (insertError) {
      console.error('[college/deadlines] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[college/deadlines] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
