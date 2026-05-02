import { NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/email/weekly-digest';

// Vercel invokes this at schedule defined in vercel.json.
// It sends: Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/weekly-digest] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/weekly-digest] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
