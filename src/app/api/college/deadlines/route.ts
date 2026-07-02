import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireCampusAuth, isAuthError } from '@/lib/college/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusAuth('deadlines:manage');
    if (isAuthError(auth)) return auth;

    const serviceClient = await import('@/lib/supabase/server').then((m) => m.createServiceClient());

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
      college_id: auth.org.id,
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
