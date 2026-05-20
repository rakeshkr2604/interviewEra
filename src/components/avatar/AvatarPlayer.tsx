'use client'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import { useResilientVideo } from '@/hooks/useResilientVideo'
import Image from 'next/image'

interface AvatarPlayerProps {
  interviewerId: InterviewerId
  isSpeaking: boolean
  className?: string
}

export function AvatarPlayer({ interviewerId, isSpeaking, className = '' }: AvatarPlayerProps) {
  const interviewer = getInterviewerById(interviewerId)
  const videoSrc = interviewer?.video ?? ''
  const avatarImageSrc = interviewer?.avatarImage ?? '/default-avatar.png'

  const { videoRef, failed } = useResilientVideo({ active: isSpeaking, src: videoSrc })
  const hasVideo = !!videoSrc && !failed

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-(--bg-secondary) ${className}`}
      style={{
        boxShadow: isSpeaking ? '0 0 40px var(--avatar-glow)' : 'none',
        transition: 'box-shadow 400ms ease',
      }}
    >
      {/* Idle base layer — always present. Calm "breathing" portrait while the
          interviewer is silent (thinking / scoring / listening). This is what
          replaces the old frozen last-video-frame / black-frame symptom. */}
      <Image
        src={avatarImageSrc}
        alt={`${interviewer?.name ?? 'Interviewer'} avatar`}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 420px"
        className={`h-full w-full object-cover object-center transition-opacity duration-500 ${
          isSpeaking && hasVideo ? 'opacity-0' : 'opacity-100'
        } ${!isSpeaking ? 'ie-avatar-breathe' : ''}`}
      />

      {/* Speaking layer — video only ever visible during active TTS. Kept
          mounted so the resilient controller can warm/recover the decoder;
          transport is owned entirely by useResilientVideo (no autoPlay). */}
      {hasVideo && (
        <video
          ref={videoRef}
          key={videoSrc}
          src={videoSrc}
          poster={avatarImageSrc}
          loop
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
            isSpeaking ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      )}

      {!hasVideo && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white">
          Video unavailable
        </p>
      )}

      {isSpeaking && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--accent-success)" />
          <span className="text-xs font-medium text-white">Speaking</span>
        </div>
      )}
    </div>
  )
}
