import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot';
import { buildCandidateNotifications, unreadNotificationCount } from '@/lib/candidate/notifications';

/**
 * Lightweight, lazily-fetched badge count for the top-bar notification bell.
 * Intentionally NOT folded into the dashboard layout's server render — the
 * layout wraps every authenticated page, and a full candidate snapshot
 * (interviews/resumes/enrollment) is too heavy to add to every page's
 * critical path just for a badge number. This runs as a separate, non-blocking
 * client fetch after the page has already painted.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await loadCandidateSnapshot(user.id, { client: supabase });
  const count = unreadNotificationCount(buildCandidateNotifications(snapshot));

  return NextResponse.json({ count });
}
