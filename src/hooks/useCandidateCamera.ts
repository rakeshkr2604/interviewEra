'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [status, setStatus] = useState<CandidateCameraStatus>('idle')

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setStatus('idle')
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }

    let cancelled = false
    setStatus('starting')

    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setStatus('active')
      })
      .catch(() => {
        if (!cancelled) setStatus('denied')
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [active])

  // Bind stream after the <video> mounts (status flips to active first).
  useEffect(() => {
    const el = videoRef.current
    const stream = streamRef.current
    if (status !== 'active' || !el || !stream) return
    el.srcObject = stream
    void el.play().catch(() => {})
  }, [status])

  return { videoRef, status }
}
