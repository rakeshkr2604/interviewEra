/**
 * Deterministic resource disposal (audit Phase 9 — "all resources cleaned
 * deterministically; no resource survives interview completion").
 *
 * Every owner (AudioSessionManager, SttPipeline, TtsPipeline, orchestrator)
 * registers its disposers here. `disposeAll()`:
 *   - runs in LIFO order (resources torn down in reverse acquisition order),
 *   - is idempotent (safe to call repeatedly; each disposer runs at most once),
 *   - swallows and logs disposer errors so one failure cannot strand others,
 *   - emits a `ResourceLifecycle` log per disposer.
 *
 * Pure and dependency-free apart from the optional logger.
 */
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type { TurnContext } from '@/lib/voice/core/ids'

export type Disposer = () => void | Promise<void>

interface RegisteredDisposer {
  label: string
  dispose: Disposer
  disposed: boolean
}

export interface DisposalRegistryOptions {
  logger?: VoiceLogger
  /** Context for log attribution (session-scoped). */
  ctx?: Pick<TurnContext, 'interviewId' | 'sessionId' | 'turnId' | 'correlationId'> | null
}

export class DisposalRegistry {
  private readonly entries: RegisteredDisposer[] = []
  private readonly logger: VoiceLogger
  private ctx: DisposalRegistryOptions['ctx']
  private disposed = false

  constructor(opts?: DisposalRegistryOptions) {
    this.logger = opts?.logger ?? createVoiceLogger('disposal')
    this.ctx = opts?.ctx ?? null
  }

  /** Update the attribution context (e.g. once the session id is known). */
  setContext(ctx: DisposalRegistryOptions['ctx']): void {
    this.ctx = ctx
  }

  /**
   * Register a disposer. Returns a function that disposes just this entry
   * early (also idempotent). Registering after `disposeAll()` disposes
   * immediately to avoid leaks.
   */
  register(label: string, dispose: Disposer): () => Promise<void> {
    const entry: RegisteredDisposer = { label, dispose, disposed: false }

    if (this.disposed) {
      // Registry already torn down — dispose immediately, do not retain.
      void this.runOne(entry)
      return async () => {}
    }

    this.entries.push(entry)
    this.logger.debug('resource_created', this.ctx ?? null, { resource: label })
    return async () => {
      await this.runOne(entry)
    }
  }

  private async runOne(entry: RegisteredDisposer): Promise<void> {
    if (entry.disposed) return
    entry.disposed = true
    try {
      await entry.dispose()
      this.logger.debug('resource_disposed', this.ctx ?? null, { resource: entry.label })
    } catch (err) {
      this.logger.error('resource_dispose_failed', this.ctx ?? null, {
        resource: entry.label,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /** Tear down every registered resource in LIFO order. Idempotent. */
  async disposeAll(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    // LIFO: copy + reverse so registration during disposal (rare) does not mutate.
    const ordered = this.entries.slice().reverse()
    for (const entry of ordered) {
      await this.runOne(entry)
    }
    this.entries.length = 0
  }

  isDisposed(): boolean {
    return this.disposed
  }

  /** Count of not-yet-disposed resources (leak detection in tests). */
  activeCount(): number {
    return this.entries.filter((e) => !e.disposed).length
  }
}
