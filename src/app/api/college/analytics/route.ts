import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeCampusAnalytics } from '@/lib/college/analytics';
import { requireCampusOrgAccess } from '@/lib/college/api-auth';
import { resolveCampusRole } from '@/lib/college/rbac';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  if (!resolveCampusRole(profile?.plan_tier)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const collegeId = request.nextUrl.searchParams.get('collegeId');
  const range = request.nextUrl.searchParams.get('range') || '30';

  if (!collegeId) {
    return NextResponse.json({ error: 'Missing collegeId' }, { status: 400 });
  }

  const access = await requireCampusOrgAccess(user.id, collegeId);
  if (!access) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await computeCampusAnalytics(collegeId, range);
  return NextResponse.json(data);
}
