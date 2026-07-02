import { NextResponse } from 'next/server';
import { requireCampusAuth, isAuthError } from '@/lib/college/api-auth';
import { buildActivityFeed } from '@/lib/college/activity';

export async function GET(): Promise<NextResponse> {
  const auth = await requireCampusAuth('analytics:read');
  if (isAuthError(auth)) return auth;

  const events = await buildActivityFeed(auth.org.id, 25);
  return NextResponse.json({ events });
}
