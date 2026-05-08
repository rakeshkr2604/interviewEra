import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
/** Public landing stat — cache 1h at CDN. */
export const revalidate = 3600;

const FALLBACK = NextResponse.json(
  { displayCount: '1,000+' },
  { status: 200, headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
);

export async function GET(): Promise<NextResponse> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK;
  }
  try {
    const supabase = createServiceClient();
    const { count: studentCount, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) return FALLBACK;

    const displayCount =
      studentCount != null && studentCount > 10
        ? `${studentCount.toLocaleString('en-IN')}+`
        : '1,000+';

    return NextResponse.json(
      { displayCount },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      },
    );
  } catch {
    return FALLBACK;
  }
}
