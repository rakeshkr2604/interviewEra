import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
// No caching — health checks must always reflect live state
export const revalidate = 0

export async function GET(): Promise<NextResponse> {
  const start = Date.now()

  try {
    // Lightweight DB ping — counts one row with no data transfer
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      // Do not echo provider error strings to unauthenticated clients.
      console.error('[health] db ping failed', error.message)
      return NextResponse.json(
        { status: 'degraded', db: 'error', latencyMs: Date.now() - start },
        { status: 503 },
      )
    }

    let storageOk = true
    try {
      const { error: storageError } = await supabase.storage.from('resumes').list('', { limit: 1 })
      if (storageError) {
        storageOk = false
        console.error('[health] storage resumes list failed', storageError.message)
      }
    } catch (e) {
      storageOk = false
      console.error(
        '[health] storage resumes list threw',
        e instanceof Error ? e.message : 'storage list failed',
      )
    }

    return NextResponse.json({
      status: storageOk ? 'ok' : 'degraded',
      db: 'connected',
      storageResumes: { ok: storageOk },
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    })
  } catch (err) {
    console.error(
      '[health] unexpected',
      err instanceof Error ? err.message : 'Unknown error',
    )
    return NextResponse.json(
      {
        status: 'error',
        latencyMs: Date.now() - start,
      },
      { status: 503 },
    )
  }
}
