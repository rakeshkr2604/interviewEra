import { createServiceClient } from '@/lib/supabase/server';
import type { ActivityEvent } from './types';

export async function buildActivityFeed(orgId: string, limit = 20): Promise<ActivityEvent[]> {
  const serviceClient = createServiceClient();
  const events: ActivityEvent[] = [];

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id, enrolled_at, users!inner(name, email)')
    .eq('college_id', orgId)
    .order('enrolled_at', { ascending: false })
    .limit(limit);

  for (const row of enrollments ?? []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!user) continue;
    events.push({
      id: `enrollment-${row.user_id}`,
      type: 'enrollment',
      title: 'Student enrolled',
      description: `${user.name ?? user.email} joined the campus program`,
      occurred_at: row.enrolled_at,
    });
  }

  const { data: students } = await serviceClient
    .from('college_enrollments')
    .select('user_id')
    .eq('college_id', orgId);

  const studentIds = (students ?? []).map((s) => s.user_id);

  if (studentIds.length > 0) {
    const { data: interviews } = await serviceClient
      .from('interviews')
      .select('id, user_id, role, completed_at, users!inner(name, email)')
      .in('user_id', studentIds)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit);

    for (const interview of interviews ?? []) {
      const user = Array.isArray(interview.users) ? interview.users[0] : interview.users;
      if (!user) continue;
      events.push({
        id: `interview-${interview.id}`,
        type: 'interview',
        title: 'Interview completed',
        description: `${user.name ?? user.email} finished ${interview.role}`,
        occurred_at: interview.completed_at as string,
      });
    }
  }

  const { data: invites } = await serviceClient
    .from('campus_invites')
    .select('id, email, invited_at, status')
    .eq('org_id', orgId)
    .order('invited_at', { ascending: false })
    .limit(limit);

  for (const invite of invites ?? []) {
    if (invite.status === 'accepted') continue;
    events.push({
      id: `invite-${invite.id}`,
      type: 'invite',
      title: invite.status === 'pending' ? 'Invitation sent' : `Invitation ${invite.status}`,
      description: invite.email,
      occurred_at: invite.invited_at,
    });
  }

  const { data: deadlines } = await serviceClient
    .from('college_deadlines')
    .select('id, description, created_at')
    .eq('college_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  for (const deadline of deadlines ?? []) {
    events.push({
      id: `deadline-${deadline.id}`,
      type: 'deadline',
      title: 'Deadline created',
      description: deadline.description ?? 'New milestone',
      occurred_at: deadline.created_at,
    });
  }

  return events
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, limit);
}
