'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useActiveInterviewNavGuard } from '@/components/interview/active-interview-nav-guard'
import { cn } from '@/lib/utils'

const STREAK_EVENT = 'ie-streak-updated'

let streakFetchInFlight: Promise<number> | null = null

/**
 * Module-level (not per-instance) so the toast fires once even though
 * StreakCounter is mounted twice at once — mobile header (DashboardChrome)
 * and desktop sidebar (Sidebar) both listen to the same window event.
 */
let lastToastedStreak = -1

async function fetchStreak(): Promise<number> {
  if (streakFetchInFlight) return streakFetchInFlight

  streakFetchInFlight = (async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0

    const { data } = await supabase
      .from('user_progress')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle()

    const n = Number(data?.current_streak ?? 0)
    return Number.isFinite(n) ? n : 0
  })().finally(() => {
    streakFetchInFlight = null
  })

  return streakFetchInFlight
}

export function StreakCounter({
  className,
  initialStreak,
}: {
  className?: string
  /** Server-provided streak — skips the mount fetch when set. */
  initialStreak: number
}) {
  const [streak, setStreak] = useState<number>(initialStreak)
  const lastKnown = useRef(initialStreak)
  const [pulse, setPulse] = useState(0)
  const { isGuarding, interceptNavigation } = useActiveInterviewNavGuard()

  useEffect(() => {
    let cancelled = false
    lastKnown.current = initialStreak

    function onRetentionEvent(ev: Event) {
      const e = ev as CustomEvent<{ streak?: number }>
      if (typeof e.detail?.streak !== 'number' || cancelled) return
      const next = e.detail.streak
      if (next > lastKnown.current) {
        setPulse((p) => p + 1)
        if (next > lastToastedStreak) {
          lastToastedStreak = next
          const msg =
            next === 1
              ? '🔥 Streak started! Keep it going tomorrow.'
              : next >= 7
                ? `🔥 ${next}-day streak! You're on fire!`
                : `🔥 ${next}-day streak! Great consistency.`
          toast.success(msg, {
            description: 'Quality session counted toward your streak.',
            duration: 5000,
          })
        }
      }
      lastKnown.current = next
      setStreak(next)
    }

    function onVisibility() {
      if (document.visibilityState === 'visible')
        void fetchStreak().then((n) => {
          if (!cancelled) {
            lastKnown.current = n
            setStreak(n)
          }
        })
    }

    window.addEventListener(STREAK_EVENT, onRetentionEvent)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.removeEventListener(STREAK_EVENT, onRetentionEvent)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [initialStreak])

  const n = streak
  const streakLabel = n === 1 ? '1 day streak' : `${n} days streak`

  return (
    <Link
      href="/profile/badges"
      className={cn(className, isGuarding && 'cursor-not-allowed opacity-60')}
      aria-label={`${n} day quality streak`}
      aria-disabled={isGuarding || undefined}
      title={isGuarding ? 'Interview in progress' : undefined}
      prefetch={false}
      onClick={(e) => {
        if (interceptNavigation()) {
          e.preventDefault()
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        borderRadius: '0.65rem',
        padding: '0.25rem 0.65rem',
        fontSize: '0.8125rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: 'var(--text-secondary)',
        background: 'color-mix(in srgb, var(--accent-warning) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--card-border) 70%, transparent)',
        textDecoration: 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <motion.span
        key={pulse}
        initial={{ scale: 1, rotate: 0 }}
        animate={
          pulse > 0
            ? {
                scale: [1, 1.38, 1],
                rotate: [0, -11, 6, 0],
              }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.52, ease: 'easeOut' }}
        style={{ lineHeight: 1 }}
      >
        🔥
      </motion.span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{streakLabel}</span>
    </Link>
  )
}
