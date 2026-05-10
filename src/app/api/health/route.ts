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
      return NextResponse.json(
        { status: 'degraded', db: 'error', message: error.message },
        { status: 503 }
      )
    }

    let storageResumes: { ok: boolean; message?: string } = { ok: true }
    try {
      const { error: storageError } = await supabase.storage.from('resumes').list('', { limit: 1 })
      if (storageError) {
        storageResumes = { ok: false, message: storageError.message }
      }
    } catch (e) {
      storageResumes = {
        ok: false,
        message: e instanceof Error ? e.message : 'storage list failed',
      }
    }

    return NextResponse.json({
      status: storageResumes.ok ? 'ok' : 'degraded',
      db: 'connected',
      storageResumes,
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        latencyMs: Date.now() - start,
      },
      { status: 503 }
    )
  }
}
