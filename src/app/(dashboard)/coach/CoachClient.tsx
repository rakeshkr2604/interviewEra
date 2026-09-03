'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MeetingConsumer,
  MeetingProvider,
  useAgentParticipant,
  useMeeting,
  useParticipant,
} from '@videosdk.live/react-sdk'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Mic,
  MicOff,
  RotateCcw,
  Trash2,
  Video,
  VideoOff,
} from 'lucide-react'
import {
  clearSessionHistory,
  completeSessionRecord,
  formatSessionClock,
  loadSessionHistory,
  startSessionRecord,
  type CoachSessionRecord,
} from './sessionHistory'
import {
  formatCoachCooldownHint,
  type CoachDurationMinutes,
} from '@/lib/coach/constants'

type CoachEntitlementResponse = {
  isPaid: boolean
  planTier: string
  allowedDurations: CoachDurationMinutes[]
  defaultDurationMinutes: CoachDurationMinutes
  freeSessionsPerWindow: number
  freeCooldownHours: number
  paidSessionsPerDay: number
  canStart: boolean
  upgradeUrl: string
  quota: {
    remaining: number
    limit: number
    resetInSeconds: number
    used: number
  }
}

/** Room-scoped join token + session metadata from POST /api/coach/session. */
type CoachSessionConfig = {
  token: string
  roomId: string
  durationMinutes: CoachDurationMinutes
  maxDurationSeconds: number
}

type MediaTrackStream = { track?: MediaStreamTrack } | null | undefined

type MeetingParticipantLike = {
  id?: string
  isAgent?: boolean
  displayName?: string
  mode?: string
}

type UseMeetingOptions = NonNullable<Parameters<typeof useMeeting>[0]>
type VideoSdkParticipant = Parameters<NonNullable<UseMeetingOptions['onParticipantJoined']>>[0]

function findAgentParticipantId(
  entries: [string, unknown][],
  localId?: string
): string | null {
  for (const [id, raw] of entries) {
    if ((raw as MeetingParticipantLike).isAgent) return id
  }
  for (const [id, raw] of entries) {
    if (id === localId) continue
    const name = ((raw as MeetingParticipantLike).displayName ?? '').toLowerCase()
    if (name.includes('agent') || name.includes('rohan') || name.includes('coach')) {
      return id
    }
  }
  const remote = entries.filter(([id]) => id !== localId)
  if (remote.length === 1) return remote[0][0]
  return null
}

function attachMediaStream(
  el: HTMLMediaElement | null,
  stream: MediaTrackStream
) {
  if (!el) return
  if (stream?.track) {
    el.srcObject = new MediaStream([stream.track])
    void el.play().catch(() => {
      // Autoplay may be blocked until a user gesture.
    })
  } else {
    el.srcObject = null
  }
}

const iconBtnBase =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50'

const primaryBtn =
  'inline-flex items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_color-mix(in_srgb,var(--accent-primary)_30%,transparent)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50'
const dangerBtn =
  'inline-flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent-danger)_16%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-danger)] transition hover:bg-[color-mix(in_srgb,var(--accent-danger)_26%,transparent)]'
const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground'

function LocalMediaControls({
  micOn,
  webcamOn,
  onToggleMic,
  onToggleWebcam,
}: {
  micOn: boolean
  webcamOn: boolean
  onToggleMic: () => void
  onToggleWebcam: () => void
}) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        title={micOn ? 'Mute mic' : 'Unmute mic'}
        className={`${iconBtnBase} ${
          micOn
            ? 'border-[var(--card-border)] bg-secondary text-secondary-foreground hover:bg-muted'
            : 'border-transparent bg-[color-mix(in_srgb,var(--accent-danger)_18%,transparent)] text-[var(--accent-danger)]'
        }`}
        onClick={onToggleMic}
      >
        {micOn ? <Mic className="h-5 w-5" aria-hidden /> : <MicOff className="h-5 w-5" aria-hidden />}
      </button>
      <button
        type="button"
        aria-label={webcamOn ? 'Turn camera off' : 'Turn camera on'}
        title={webcamOn ? 'Camera off' : 'Camera on'}
        className={`${iconBtnBase} ${
          webcamOn
            ? 'border-[var(--card-border)] bg-secondary text-secondary-foreground hover:bg-muted'
            : 'border-transparent bg-[color-mix(in_srgb,var(--accent-danger)_18%,transparent)] text-[var(--accent-danger)]'
        }`}
        onClick={onToggleWebcam}
      >
        {webcamOn ? (
          <Video className="h-5 w-5" aria-hidden />
        ) : (
          <VideoOff className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  )
}

function LocalParticipantTile({ participantId }: { participantId: string }) {
  const { micStream, webcamStream, webcamOn, displayName, isLocal } =
    useParticipant(participantId)
  const { toggleMic, toggleWebcam, localMicOn, localWebcamOn } = useMeeting()
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const showVideo = Boolean(webcamOn && webcamStream?.track)

  useEffect(() => {
    attachMediaStream(audioRef.current, micStream)
  }, [micStream])

  useEffect(() => {
    attachMediaStream(videoRef.current, showVideo ? webcamStream : null)
  }, [webcamStream, showVideo])

  return (
    <div>
      <article className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] shadow-sm">
        <div className="relative aspect-video bg-muted">
          {showVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--muted))] px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground">
                {(displayName || 'Y').slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {displayName || 'You'}
              </p>
              <p className="text-xs text-muted-foreground">Camera is off</p>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            You
          </span>
        </div>
        <audio ref={audioRef} autoPlay playsInline muted={isLocal} />
      </article>
      <LocalMediaControls
        micOn={localMicOn}
        webcamOn={localWebcamOn}
        onToggleMic={() => void toggleMic()}
        onToggleWebcam={() => void toggleWebcam()}
      />
    </div>
  )
}

const INTERVIEWER_STILL_SRC = '/avatars/male/rohan-avatar.png'
const INTERVIEWER_VIDEO_SRC = '/avatars/male/rohan-ai.mp4'

function AgentParticipantMedia({ participantId }: { participantId: string }) {
  const [agentState, setAgentState] = useState('idle')
  const {
    micStream,
    displayName,
    isActiveSpeaker,
    agentState: liveAgentState,
  } = useAgentParticipant(participantId, {
    onAgentStateChanged: ({ state }: { state?: string }) => setAgentState(state ?? 'idle'),
  })

  const resolvedState = (liveAgentState || agentState || '').toLowerCase()
  const isSpeaking = resolvedState === 'speaking' || isActiveSpeaker

  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    attachMediaStream(audioRef.current, micStream)
  }, [micStream])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isSpeaking) {
      void el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [isSpeaking])

  return (
    <article className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] bg-[var(--card-bg,var(--card))] shadow-sm">
      <div
        className="relative aspect-video overflow-hidden bg-[var(--bg-secondary,#0f172a)]"
        style={{
          boxShadow: isSpeaking
            ? '0 0 40px var(--avatar-glow, color-mix(in srgb, var(--accent-primary) 35%, transparent))'
            : 'none',
          transition: 'box-shadow 400ms ease',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- isolated demo page */}
        <img
          src={INTERVIEWER_STILL_SRC}
          alt={displayName || 'Interview Coach'}
          className={`absolute inset-0 h-full w-full object-cover object-[center_22%] transition-opacity duration-500 ${
            isSpeaking ? 'opacity-0' : 'opacity-100 ie-avatar-breathe'
          }`}
        />
        <video
          ref={videoRef}
          src={INTERVIEWER_VIDEO_SRC}
          poster={INTERVIEWER_STILL_SRC}
          loop
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover object-[center_22%] transition-opacity duration-500 ${
            isSpeaking ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
        <span className="absolute left-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
          Coach
        </span>
        {isSpeaking ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-success)]" />
            <span className="text-xs font-medium text-white">Speaking</span>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2">
            <p className="text-sm font-medium text-white">
              {displayName || 'Interview Coach'}
            </p>
          </div>
        )}
      </div>
      <audio ref={audioRef} autoPlay playsInline />
    </article>
  )
}

function formatSessionElapsed(totalSeconds: number): string {
  return formatSessionClock(totalSeconds)
}

function useSessionElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return
    const startedAt = Date.now()
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    const raf = window.requestAnimationFrame(tick)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearInterval(id)
    }
  }, [active])

  return active ? elapsed : 0
}

function CoachPortrait() {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_32%,var(--card-border))] bg-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)] shadow-[var(--ie-shadow-card,0_8px_30px_rgba(0,0,0,0.08))]">
      {/* eslint-disable-next-line @next/next/no-img-element -- coach avatar */}
      <img
        src={INTERVIEWER_STILL_SRC}
        alt="Rohan, AI Interview Coach"
        className="aspect-[4/5] w-full object-cover object-[center_18%] ie-avatar-breathe"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 py-4">
        <p className="text-base font-semibold text-white">Rohan</p>
        <p className="text-sm text-white/85">AI Interview Coach</p>
      </div>
    </aside>
  )
}

function CoachFallbackTile({
  status,
}: {
  status: 'connecting' | 'disconnected' | 'waiting'
}) {
  const label =
    status === 'connecting'
      ? 'Connecting coach…'
      : status === 'disconnected'
        ? 'Coach disconnected'
        : 'Waiting for coach…'

  return (
    <article className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] bg-[var(--card-bg,var(--card))] shadow-sm">
      <div className="relative aspect-video overflow-hidden bg-[var(--bg-secondary,#0f172a)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- coach avatar */}
        <img
          src={INTERVIEWER_STILL_SRC}
          alt="Rohan, AI Interview Coach"
          className="h-full w-full object-cover object-[center_22%] ie-avatar-breathe"
        />
        <span className="absolute left-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
          Coach
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
          <p className="text-sm font-medium text-white">Rohan</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
            {status === 'connecting' ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
            ) : null}
            {label}
          </p>
        </div>
      </div>
    </article>
  )
}

function SessionHistoryPanel({
  history,
  activeSessionId,
  elapsedSeconds,
  onClear,
}: {
  history: CoachSessionRecord[]
  activeSessionId: string | null
  elapsedSeconds: number
  onClear: () => void
}) {
  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card-bg,var(--card))_92%,transparent)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Session history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Duration is measured from coach connect to leave.
          </p>
        </div>
        {history.length > 0 ? (
          <button type="button" className={ghostBtn} onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No sessions yet. Start a session, connect the coach, then leave to log duration.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)]">
          {history.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card-bg,var(--card))] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-muted-foreground">{row.roomId}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(row.startedAt).toLocaleString()}
                  {row.status === 'active' ? ' · in progress' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  Cam {row.cameraOn ? 'on' : 'off'}
                </span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] px-2.5 py-1 font-mono tabular-nums text-[var(--accent-primary)]">
                  {formatSessionClock(
                    row.status === 'active' && row.id === activeSessionId
                      ? elapsedSeconds
                      : row.durationSeconds
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatResetHint(resetInSeconds: number): string {
  return formatCoachCooldownHint(resetInSeconds)
}

function MeetingControls({
  roomId,
  durationMinutes,
  maxDurationSeconds,
  onHardReset,
}: {
  roomId: string
  durationMinutes: CoachDurationMinutes
  maxDurationSeconds: number
  onHardReset: () => void
}) {
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const joinInFlightRef = useRef(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showTech, setShowTech] = useState(false)
  const [agentDispatchAcknowledged, setAgentDispatchAcknowledged] = useState(false)
  const [agentParticipantId, setAgentParticipantId] = useState<string | null>(null)
  const agentParticipantIdRef = useRef<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<CoachSessionRecord[]>([])
  const [meetingState, setMeetingState] = useState<string>('idle')

  useEffect(() => {
    setHistory(loadSessionHistory())
  }, [])

  const clearJoinLock = useCallback(() => {
    joinInFlightRef.current = false
    setJoining(false)
  }, [])

  const { join, leave, participants, localParticipant, localWebcamOn } = useMeeting({
    onMeetingJoined: () => {
      clearJoinLock()
      setJoined(true)
      setMeetingState('joined')
      setAgentError(null)
    },
    onMeetingLeft: () => {
      clearJoinLock()
      setJoined(false)
      setMeetingState('left')
      setAgentParticipantId(null)
      setAgentDispatchAcknowledged(false)
    },
    onParticipantJoined: (participant: VideoSdkParticipant) => {
      const p = participant as unknown as MeetingParticipantLike
      if (p.isAgent) {
        setAgentParticipantId(participant.id)
        setAgentError(null)
      }
    },
    onParticipantLeft: (participant: VideoSdkParticipant) => {
      const p = participant as unknown as MeetingParticipantLike
      const wasAgent =
        p.isAgent || participant.id === agentParticipantIdRef.current
      if (!wasAgent) return
      setAgentParticipantId(null)
      setAgentDispatchAcknowledged(false)
      setAgentError('Coach left the session. Tap Connect coach to rejoin.')
    },
    onError: ({ code, message }: { code?: string; message?: string }) => {
      const text = `${code ?? ''} ${message ?? ''}`
      console.error('[coach] meeting error', code, message)
      if (text.includes('OPERATION_IN_PROGRESS') || text.includes('already in progress')) {
        return
      }
      clearJoinLock()
      setAgentError(message || code || 'Meeting error')
      setMeetingState('error')
    },
    onMeetingStateChanged: ({ state }: { state?: string }) => {
      setMeetingState(state ?? 'IDLE')
      if (state === 'CONNECTED') {
        clearJoinLock()
        setJoined(true)
        setAgentError(null)
      }
      if (state === 'FAILED' || state === 'DISCONNECTED' || state === 'CLOSED') {
        clearJoinLock()
        if (state === 'FAILED') {
          setJoined(false)
          setAgentError('Meeting connection failed. Reset the room, then start again.')
        }
      }
    },
  })

  const entries = [...participants.entries()]
  const localId = localParticipant?.id
  const resolvedAgentId =
    agentParticipantId ?? findAgentParticipantId(entries, localId)
  agentParticipantIdRef.current = resolvedAgentId

  useEffect(() => {
    if (!joined) return
    setAgentParticipantId((current) => {
      if (resolvedAgentId === current) return current
      if (resolvedAgentId) setAgentError(null)
      return resolvedAgentId
    })
  }, [joined, resolvedAgentId])

  useEffect(() => {
    if (!resolvedAgentId || activeSessionId) return
    const record = startSessionRecord(roomId, localWebcamOn)
    setActiveSessionId(record.id)
    setHistory(loadSessionHistory())
  }, [resolvedAgentId, activeSessionId, roomId, localWebcamOn])

  const agentLive = Boolean(resolvedAgentId)
  const sessionActive = joined && agentLive
  const elapsedSeconds = useSessionElapsedSeconds(sessionActive)
  const remainingSeconds = Math.max(0, maxDurationSeconds - elapsedSeconds)
  const leaveRef = useRef<() => void>(() => {})

  function finalizeActiveSession(cameraOn: boolean) {
    if (!activeSessionId) return
    completeSessionRecord(activeSessionId, elapsedSeconds, cameraOn)
    setActiveSessionId(null)
    setHistory(loadSessionHistory())
  }

  function handleLeave() {
    finalizeActiveSession(localWebcamOn)
    try {
      leave()
    } catch {
      // ignore leave races
    }
    clearJoinLock()
    setJoined(false)
    setAgentDispatchAcknowledged(false)
    setAgentParticipantId(null)
  }

  leaveRef.current = handleLeave

  useEffect(() => {
    if (!sessionActive) return
    if (elapsedSeconds < maxDurationSeconds) return
    setAgentError(`Session ended — ${durationMinutes}-minute limit reached.`)
    leaveRef.current()
  }, [elapsedSeconds, maxDurationSeconds, sessionActive, durationMinutes])

  useEffect(() => {
    if (!joining) return
    const timeoutId = window.setTimeout(() => {
      if (!joinInFlightRef.current) return
      clearJoinLock()
      setAgentError(
        'Join is taking too long. Reset the room for a fresh meeting, then start again.'
      )
    }, 15_000)
    return () => window.clearTimeout(timeoutId)
  }, [joining, clearJoinLock])

  async function handleStartSession() {
    if (joined || joining || joinInFlightRef.current) return
    joinInFlightRef.current = true
    setJoining(true)
    setAgentError(null)
    setMeetingState('joining')
    try {
      const result = join() as void | Promise<unknown>
      await Promise.resolve(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[coach] join threw', message)
      if (message.includes('OPERATION_IN_PROGRESS') || message.includes('already in progress')) {
        return
      }
      clearJoinLock()
      setMeetingState('error')
      setAgentError(message || 'Failed to join meeting')
    }
  }

  const localEntry =
    entries.find(([id]) => id === localId) ??
    entries.find(([id]) => id !== resolvedAgentId)

  async function connectAgent() {
    setAgentError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/coach/session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
        cache: 'no-store',
      })
      const data = (await res.json()) as {
        error?: string
        refunded?: boolean
        ok?: boolean
      }
      if (!res.ok) {
        throw new Error(
          data.refunded
            ? `${data.error ?? 'Failed to connect coach'}. Your session quota was restored — you can start again.`
            : data.error ?? `Failed to connect coach (${res.status})`
        )
      }
      setAgentDispatchAcknowledged(true)
    } catch (err) {
      setAgentDispatchAcknowledged(false)
      setAgentParticipantId(null)
      setAgentError(err instanceof Error ? err.message : 'Failed to connect coach')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {!joined ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] shadow-[var(--ie-shadow-card,0_8px_30px_rgba(0,0,0,0.06))]">
          <div className="grid items-stretch lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
            <div className="flex flex-col justify-center gap-6 p-6 sm:p-8 lg:p-10">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent-primary)] uppercase">
                  {durationMinutes}-minute session
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  AI Interview Coach
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Join the room, then connect Rohan. Your timer starts when the coach is live and
                  ends automatically at {durationMinutes} minutes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={joining}
                  onClick={() => void handleStartSession()}
                >
                  {joining ? 'Starting…' : 'Join room'}
                </button>
                {(joining || agentError) && (
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => {
                      clearJoinLock()
                      setAgentError(null)
                      onHardReset()
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Reset room
                  </button>
                )}
              </div>

              {agentError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--accent-danger)]"
                >
                  {agentError}
                </p>
              ) : (
                <ol className="space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">1.</span> Join the room
                  </li>
                  <li>
                    <span className="font-medium text-foreground">2.</span> Connect the coach
                  </li>
                  <li>
                    <span className="font-medium text-foreground">3.</span> Practice until the{' '}
                    {durationMinutes}-minute limit
                  </li>
                </ol>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  className={ghostBtn}
                  aria-expanded={showTech}
                  onClick={() => setShowTech((v) => !v)}
                >
                  {showTech ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Session details
                </button>
                {showTech ? (
                  <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                    <p>
                      Room ID: <span className="text-foreground">{roomId}</span>
                    </p>
                    <p className="mt-1">
                      SDK: <span className="text-foreground">{meetingState}</span>
                    </p>
                    <p className="mt-1">
                      Limit:{' '}
                      <span className="text-foreground">{maxDurationSeconds}s</span>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[var(--card-border)] p-4 sm:p-5 lg:border-t-0 lg:border-l">
              <CoachPortrait />
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Live session</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {durationMinutes}-minute Coach · Room{' '}
                <span className="font-mono">{roomId}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {agentLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]" />
                  Coach live
                </span>
              ) : agentDispatchAcknowledged ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
                  Connecting…
                </span>
              ) : null}
              <button
                type="button"
                className={primaryBtn}
                disabled={busy || agentLive}
                onClick={() => void connectAgent()}
              >
                {busy ? 'Connecting…' : agentLive ? 'Connected' : 'Connect coach'}
              </button>
              <button type="button" className={dangerBtn} onClick={handleLeave}>
                Leave
              </button>
            </div>
          </div>

          {sessionActive ? (
            <div
              className="flex items-center justify-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_28%,var(--card-border))] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] px-4 py-5"
              aria-live="polite"
              aria-label={`Time remaining ${formatSessionElapsed(remainingSeconds)}`}
            >
              <Clock className="h-6 w-6 text-[var(--accent-primary)]" aria-hidden />
              <div className="text-center">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Time remaining
                </p>
                <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground sm:text-5xl">
                  {formatSessionElapsed(remainingSeconds)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Camera {localWebcamOn ? 'on' : 'off'} · ends at {durationMinutes}:00
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Connect the coach to start the {durationMinutes}-minute timer.
            </p>
          )}

          {agentError ? (
            <p
              role="alert"
              className="rounded-xl bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--accent-danger)]"
            >
              {agentError}
            </p>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">Joining room…</p>
            ) : (
              <>
                {localEntry ? <LocalParticipantTile participantId={localEntry[0]} /> : null}
                {resolvedAgentId ? (
                  <AgentParticipantMedia participantId={resolvedAgentId} />
                ) : agentDispatchAcknowledged ? (
                  <CoachFallbackTile status="connecting" />
                ) : activeSessionId ? (
                  <CoachFallbackTile status="disconnected" />
                ) : (
                  <CoachFallbackTile status="waiting" />
                )}
              </>
            )}
          </div>
        </section>
      )}

      <SessionHistoryPanel
        history={history}
        activeSessionId={activeSessionId}
        elapsedSeconds={elapsedSeconds}
        onClear={() => {
          clearSessionHistory()
          setHistory([])
        }}
      />
    </div>
  )
}

function PreSessionPanel({
  entitlement,
  durationMinutes,
  onDurationChange,
  minting,
  error,
  onStart,
}: {
  entitlement: CoachEntitlementResponse
  durationMinutes: CoachDurationMinutes
  onDurationChange: (minutes: CoachDurationMinutes) => void
  minting: boolean
  error: string | null
  onStart: () => void
}) {
  const fiveLocked = !entitlement.allowedDurations.includes(5)
  const blocked = !entitlement.canStart

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] shadow-[var(--ie-shadow-card,0_8px_30px_rgba(0,0,0,0.06))]">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
          <div className="flex flex-col justify-center gap-6 p-6 sm:p-8 lg:p-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent-primary)] uppercase">
                Practice
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                AI Interview Coach
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Live coaching with Rohan. Free accounts get a 3-minute session every 2 hours.
                Paid plans unlock 5 minutes and more daily sessions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onDurationChange(3)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  durationMinutes === 3
                    ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]'
                    : 'border-[var(--card-border)] hover:bg-muted/40'
                }`}
              >
                <p className="text-lg font-semibold text-foreground">3 minutes</p>
                <p className="mt-1 text-xs text-muted-foreground">Free tier</p>
              </button>

              <button
                type="button"
                disabled={fiveLocked}
                onClick={() => onDurationChange(5)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  durationMinutes === 5
                    ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]'
                    : 'border-[var(--card-border)] hover:bg-muted/40'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-foreground">5 minutes</p>
                  {fiveLocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fiveLocked ? (
                    <>
                      Paid plans only ·{' '}
                      <Link
                        href={entitlement.upgradeUrl}
                        className="font-medium text-[var(--accent-primary)] underline-offset-2 hover:underline"
                      >
                        Upgrade
                      </Link>
                    </>
                  ) : (
                    'Starter & Pro'
                  )}
                </p>
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {entitlement.isPaid
                ? `${entitlement.quota.remaining} of ${entitlement.quota.limit} Coach sessions left today`
                : blocked
                  ? `Free session used — next available in ~${formatResetHint(entitlement.quota.resetInSeconds)}`
                  : 'Free: 1 × 3-minute session every 2 hours'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={primaryBtn}
                disabled={minting || blocked}
                onClick={onStart}
              >
                {minting ? 'Preparing…' : blocked ? 'Limit reached' : 'Start session'}
              </button>
              {blocked ? (
                <Link href={entitlement.upgradeUrl} className={ghostBtn}>
                  View plans
                </Link>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--accent-danger)]"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--card-border)] p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <CoachPortrait />
          </div>
        </div>
      </section>
    </div>
  )
}

export default function CoachClient() {
  const [entitlement, setEntitlement] = useState<CoachEntitlementResponse | null>(null)
  const [durationMinutes, setDurationMinutes] =
    useState<CoachDurationMinutes>(3)
  const [config, setConfig] = useState<CoachSessionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadGenRef = useRef(0)

  async function loadEntitlement(opts?: { soft?: boolean }) {
    const gen = ++loadGenRef.current
    if (!opts?.soft) setLoading(true)
    try {
      const res = await fetch('/api/coach/entitlement', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/coach')}`
        return
      }
      const data = (await res.json()) as CoachEntitlementResponse & { error?: string }
      if (gen !== loadGenRef.current) return
      if (!res.ok) {
        throw new Error(data.error ?? `Entitlement failed (${res.status})`)
      }
      setEntitlement(data)
      const nextDuration = data.allowedDurations.includes(data.defaultDurationMinutes)
        ? data.defaultDurationMinutes
        : data.allowedDurations[0] ?? 3
      setDurationMinutes((current) =>
        data.allowedDurations.includes(current) ? current : nextDuration
      )
      setError(null)
    } catch (err) {
      if (gen !== loadGenRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load Coach access')
    } finally {
      if (gen === loadGenRef.current && !opts?.soft) setLoading(false)
    }
  }

  async function mintSession(isReset = false) {
    const gen = ++loadGenRef.current
    setMinting(true)
    if (isReset) setConfig(null)
    try {
      const res = await fetch('/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes }),
        cache: 'no-store',
      })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/coach')}`
        return
      }
      const data = (await res.json()) as Partial<CoachSessionConfig> & {
        error?: string
        upgradeUrl?: string
      }
      if (gen !== loadGenRef.current) return
      if (!res.ok) {
        throw new Error(data.error ?? `Session mint failed (${res.status})`)
      }
      if (
        !data.token ||
        !data.roomId ||
        !data.maxDurationSeconds ||
        !data.durationMinutes
      ) {
        throw new Error('Session response missing required fields')
      }
      setConfig({
        token: data.token,
        roomId: data.roomId,
        durationMinutes: data.durationMinutes,
        maxDurationSeconds: data.maxDurationSeconds,
      })
      setError(null)
      void loadEntitlement({ soft: true })
    } catch (err) {
      if (gen !== loadGenRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to start Coach session')
    } finally {
      if (gen === loadGenRef.current) setMinting(false)
    }
  }

  useEffect(() => {
    void loadEntitlement()
  }, [])

  if (loading && !entitlement) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] px-6 py-16 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Loading AI Interview Coach…</p>
      </div>
    )
  }

  if (!entitlement) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg,var(--card))] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">AI Interview Coach</h1>
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] px-3 py-2 text-sm text-[var(--accent-danger)]"
        >
          {error ?? 'Unable to load Coach access'}
        </p>
      </div>
    )
  }

  if (!config) {
    return (
      <PreSessionPanel
        entitlement={entitlement}
        durationMinutes={durationMinutes}
        onDurationChange={setDurationMinutes}
        minting={minting}
        error={error}
        onStart={() => void mintSession(false)}
      />
    )
  }

  return (
    <MeetingProvider
      key={config.roomId}
      config={{
        meetingId: config.roomId,
        name: 'Candidate',
        micEnabled: false,
        webcamEnabled: false,
        debugMode: false,
      }}
      token={config.token}
    >
      <MeetingConsumer>
        {() => (
          <MeetingControls
            roomId={config.roomId}
            durationMinutes={config.durationMinutes}
            maxDurationSeconds={config.maxDurationSeconds}
            onHardReset={() => void mintSession(true)}
          />
        )}
      </MeetingConsumer>
    </MeetingProvider>
  )
}
