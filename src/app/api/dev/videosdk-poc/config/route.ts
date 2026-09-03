import { NextResponse } from 'next/server'

/** Legacy path — use POST /api/coach/session. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'Deprecated. Use POST /api/coach/session with { durationMinutes: 3 | 5 }.',
      migrateTo: '/api/coach/session',
    },
    { status: 410 }
  )
}
