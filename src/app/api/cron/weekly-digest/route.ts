import { NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/email/weekly-digest';

// Vercel invokes this at schedule defined in vercel.json.
// It sends: Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyDigest();
    console.log(`[cron/weekly-digest] sent=${result.sent} skipped=${result.skipped}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/weekly-digest] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
