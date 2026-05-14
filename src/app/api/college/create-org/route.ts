import { createServiceClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, collegeName, studentCount } = await req.json();

    if (!userId || !collegeName || !studentCount) {
      return Response.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    const { error: orgError } = await serviceClient
      .from('campus_organizations')
      .insert({
        name: collegeName,
        admin_user_id: userId,
        seat_count: studentCount,
        plan_start: new Date().toISOString().split('T')[0],
      });

    if (orgError) {
      return Response.json(
        { error: `Failed to create organization: ${orgError.message}` },
        { status: 500 }
      );
    }

    const { error: userError } = await serviceClient
      .from('users')
      .update({
        plan_tier: 'campus_admin',
      })
      .eq('id', userId);

    if (userError) {
      return Response.json(
        { error: `Failed to update user: ${userError.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[college/create-org]', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
