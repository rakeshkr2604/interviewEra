import { NextResponse } from 'next/server'

/**
 * Legacy V1 session payload endpoint.
 * Dual-agent session UI and prepare flow removed — clients should use
 * `/api/interview/script/*` for the current engine.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'gone',
      message:
        'The legacy interview session API has been retired. Start a new interview at /interview/script/start.',
    },
    { status: 410 },
  )
}
