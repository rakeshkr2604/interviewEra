'use client'

import { useEffect, useRef, useState } from 'react'
import { getCandidateCameraConstraints } from '@/lib/voice/camera-constraints'

export type CandidateCameraStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'denied'
  | 'unavailable'

interface UseCandidateCameraParams {
  /** When false, releases the camera stream. */
  active: boolean
}

interface UseCandidateCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: CandidateCameraStatus
}

/**
 * Video-only webcam preview for the interview session sidebar.
 * Uses a separate getUserMedia({ video }) stream — does not touch the mic
 * pipeline used by Web Speech / Deepgram.
 */
export function useCandidateCamera({
  active,
}: UseCandidateCameraParams): UseCandidateCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isSupported] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  )
  const [hasStream, setHasStream] = useState(false)
  const [captureError, setCaptureError] = useState<'denied' | null>(null)

  useEffect(() => {
    if (!active || !isSupported) {
      return
    }

    let cancelled = false

    void navigator.mediaDevices
      .getUserMedia({
        video: getCandidateCameraConstraints(),
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setCaptureError(null)
        setHasStream(true)
      })
      .catch(() => {
        if (!cancelled) setCaptureError('denied')
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setHasStream(false)
      setCaptureError(null)
    }
  }, [active, isSupported])

  // Bind stream after the <video> mounts (hasStream flips true first).
  useEffect(() => {
    if (!hasStream) return
    const el = videoRef.current
    const stream = streamRef.current
    if (!el || !stream) return
    el.srcObject = stream
    void el.play().catch(() => {})
  }, [hasStream])

  const status: CandidateCameraStatus = !active
    ? 'idle'
    : !isSupported
      ? 'unavailable'
      : captureError === 'denied'
        ? 'denied'
        : hasStream
          ? 'active'
          : 'starting'

  return { videoRef, status }
}
