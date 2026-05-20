'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Deterministic media-lifecycle controller for the AI avatar loop.
 *
 * Solves the iOS Safari / iOS PWA freeze: iOS suspends <video> decoding on
 * background, screen lock, incoming call, or Low Power Mode and does NOT
 * auto-resume. This hook re-establishes playback on every lifecycle edge and
 * detects a silently frozen decoder via a single currentTime watchdog.
 *
 * Engineering constraints honoured:
 *  - No timeout spam: one watchdog interval, only while active, cleared on
 *    inactive/unmount.
 *  - Bounded escalation: play() → load()+play() → give up to poster fallback.
 *  - All listeners removed on cleanup; no orphaned timers.
 */

const WATCHDOG_INTERVAL_MS = 1000
// Frames must advance within this many consecutive samples or we escalate.
const FROZEN_SAMPLES = 3
// Total hard recoveries (load()+play) before we surface the static fallback.
const MAX_HARD_RECOVERIES = 3

interface UseResilientVideoOptions {
  /** Whether the video is *supposed* to be playing right now. */
  active: boolean
  /** Changing src resets the failure/recovery budget. */
  src: string
}

interface UseResilientVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** True once recovery budget is exhausted — caller shows the poster image. */
  failed: boolean
  /** Manual recovery trigger (e.g. user tap on the fallback). */
  recover: () => void
}

export function useResilientVideo({
  active,
  src,
}: UseResilientVideoOptions): UseResilientVideoReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)

  // Refs avoid re-binding listeners on every render.
  const activeRef = useRef(active)
  const hardRecoveriesRef = useRef(0)
  const lastTimeRef = useRef(0)
  const stalledSamplesRef = useRef(0)
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { activeRef.current = active }, [active])

  // Reset recovery budget when the source changes (interviewer switch).
  // Conditional on [src] — one re-render per interviewer switch, not a loop.
  useLayoutEffect(() => {
    hardRecoveriesRef.current = 0
    stalledSamplesRef.current = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false)
  }, [src])

  /** Idempotent: ensure the element is playing if it should be. */
  const ensurePlaying = useCallback(() => {
    const video = videoRef.current
    if (!video || !activeRef.current) return
    if (!video.paused && !video.ended) return
    const p = video.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Autoplay rejection is recoverable on the next user gesture /
        // lifecycle edge; do not fail permanently here.
      })
    }
  }, [])

  /** Hard recovery: reload the media pipeline, then play. Bounded. */
  const hardRecover = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (hardRecoveriesRef.current >= MAX_HARD_RECOVERIES) {
      setFailed(true)
      return
    }
    hardRecoveriesRef.current += 1
    stalledSamplesRef.current = 0
    try {
      video.load()
    } catch {
      /* load() can throw if the element is detached mid-cleanup */
    }
    // Give the decoder a tick to re-init before re-issuing play().
    queueMicrotask(() => ensurePlaying())
  }, [ensurePlaying])

  /** Deterministic stop. Pause only — never seek a paused element on iOS
   *  (a paused-element currentTime write is a known WebKit stall trigger). */
  const ensurePaused = useCallback(() => {
    const video = videoRef.current
    if (!video || video.paused) return
    try {
      video.pause()
    } catch {
      /* element may be detached mid-cleanup */
    }
  }, [])

  const recover = useCallback(() => {
    setFailed(false)
    hardRecoveriesRef.current = 0
    stalledSamplesRef.current = 0
    ensurePlaying()
  }, [ensurePlaying])

  // ── Deterministic play/pause on the active edge ────────────────────────
  // No dependency on the <video autoPlay> attribute: the controller alone
  // owns transport, so playback can never desync from `active`.
  useEffect(() => {
    if (failed) return
    if (active) ensurePlaying()
    else ensurePaused()
  }, [active, failed, ensurePlaying, ensurePaused])

  // ── Element + lifecycle listeners ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlayable = () => { stalledSamplesRef.current = 0; ensurePlaying() }
    // iOS auto-pauses on background; if we still want playback, resume.
    const onPause = () => {
      if (activeRef.current && !video.ended) ensurePlaying()
    }
    const onStallOrWait = () => {
      // Soft nudge first; the watchdog escalates to hardRecover if needed.
      ensurePlaying()
    }
    const onError = () => hardRecover()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        stalledSamplesRef.current = 0
        ensurePlaying()
      }
    }
    // bfcache / PWA cold-resume.
    const onPageShow = () => { stalledSamplesRef.current = 0; ensurePlaying() }

    video.addEventListener('canplay', onPlayable)
    video.addEventListener('loadeddata', onPlayable)
    video.addEventListener('playing', onPlayable)
    video.addEventListener('pause', onPause)
    video.addEventListener('stalled', onStallOrWait)
    video.addEventListener('waiting', onStallOrWait)
    video.addEventListener('suspend', onStallOrWait)
    video.addEventListener('error', onError)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('focus', onVisibility)

    return () => {
      video.removeEventListener('canplay', onPlayable)
      video.removeEventListener('loadeddata', onPlayable)
      video.removeEventListener('playing', onPlayable)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('stalled', onStallOrWait)
      video.removeEventListener('waiting', onStallOrWait)
      video.removeEventListener('suspend', onStallOrWait)
      video.removeEventListener('error', onError)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onVisibility)
    }
  }, [ensurePlaying, hardRecover, src])

  // ── Frozen-frame watchdog (single interval, only while active) ─────────
  useEffect(() => {
    if (!active || failed) return
    ensurePlaying()
    lastTimeRef.current = videoRef.current?.currentTime ?? 0
    stalledSamplesRef.current = 0

    watchdogRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || document.visibilityState !== 'visible') return
      // readyState < HAVE_CURRENT_DATA means it genuinely has no frame yet —
      // that's a buffering state, not a freeze; let canplay drive it.
      if (video.readyState < 2 || video.ended) return

      const t = video.currentTime
      if (Math.abs(t - lastTimeRef.current) < 0.02) {
        stalledSamplesRef.current += 1
        if (stalledSamplesRef.current === 1) {
          ensurePlaying() // cheap nudge first
        } else if (stalledSamplesRef.current >= FROZEN_SAMPLES) {
          hardRecover()
        }
      } else {
        stalledSamplesRef.current = 0
      }
      lastTimeRef.current = t
    }, WATCHDOG_INTERVAL_MS)

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current)
        watchdogRef.current = null
      }
    }
  }, [active, failed, ensurePlaying, hardRecover])

  return { videoRef, failed, recover }
}
