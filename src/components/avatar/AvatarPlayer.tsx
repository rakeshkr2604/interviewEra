'use client'
import { useEffect, useRef, useState } from 'react'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import Image from 'next/image'

interface AvatarPlayerProps {
  interviewerId: InterviewerId
  isSpeaking: boolean
  className?: string
}

export function AvatarPlayer({ interviewerId, isSpeaking, className = '' }: AvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failedVideoSrc, setFailedVideoSrc] = useState<string | null>(null)
  const interviewer = getInterviewerById(interviewerId)
  const videoSrc = interviewer?.video ?? ''
  const avatarImageSrc = interviewer?.avatarImage ?? '/default-avatar.png'
  const videoFailed = failedVideoSrc === videoSrc

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoFailed) return
    if (isSpeaking) {
      video.play().catch(() => {
        setFailedVideoSrc(videoSrc)
      })
      return
    }
    video.pause()
    video.currentTime = 0
  }, [videoFailed, videoSrc, interviewerId, isSpeaking])

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}
         style={{ boxShadow: isSpeaking ? '0 0 40px var(--avatar-glow)' : 'none',
                  transition: 'box-shadow 400ms ease' }}>
      {!videoFailed && videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => {
            if (!isSpeaking) return
            videoRef.current?.play().catch(() => {
              setFailedVideoSrc(videoSrc)
            })
          }}
          onError={() => setFailedVideoSrc(videoSrc)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="relative flex h-full w-full flex-col items-center justify-center bg-(--bg-secondary)">
          <Image
            src={avatarImageSrc}
            alt={`${interviewer?.name ?? 'Interviewer'} avatar`}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            className="h-full w-full object-cover object-center"
          />
          <p className="absolute bottom-3 rounded bg-black/50 px-2 py-1 text-xs text-white">
            Video unavailable
          </p>
        </div>
      )}
      {isSpeaking && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5
                        rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full
                           bg-(--accent-success)" />
          <span className="text-xs font-medium text-white">Speaking</span>
        </div>
      )}
    </div>
  )
}
