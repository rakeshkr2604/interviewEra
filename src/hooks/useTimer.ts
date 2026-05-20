'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseTimerReturn {
  timeLeft: number
  isRunning: boolean
  start: () => void
  stop: () => void
  reset: (newTime?: number) => void
  percentage: number
}

export function useTimer(initialSeconds: number = 60): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  // Mirror timeLeft so start() reads the live value, not a stale closure.
  // Without this, reset(budget) + start() in the same tick lets start() see
  // the OLD timeLeft (often 0 after the prior question timed out) and bail —
  // the timer then never starts for the new question (the UI desync).
  const timeLeftRef = useRef(timeLeft)
  // Denominator for percentage tracks the most recent reset budget, not the
  // fixed initialSeconds (text vs voice questions use different budgets).
  // It's render-relevant (drives percentage) so it's state, not a ref.
  const [budget, setBudget] = useState(initialSeconds)

  // Keep the ref in sync so start()/the interval read the live value rather
  // than a stale closure. reset() also writes it synchronously for the
  // same-tick reset()+start() case (this effect would run too late there).
  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  const stop = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const start = useCallback(() => {
    if (timeLeftRef.current <= 0) return
    setIsRunning(true)
  }, [])

  const reset = useCallback((newTime?: number) => {
    stop()
    const next = newTime ?? initialSeconds
    setBudget(next)
    timeLeftRef.current = next
    setTimeLeft(next)
  }, [stop, initialSeconds])

  useEffect(() => {
    if (!isRunning) return
    // Clear any prior interval before starting a new one so a leftover timer
    // from a previous question can't run concurrently and double-decrement.
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev <= 1 ? 0 : prev - 1
        timeLeftRef.current = next
        if (next === 0) stop()
        return next
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, stop])

  const denom = budget > 0 ? budget : 1
  return {
    timeLeft,
    isRunning,
    start,
    stop,
    reset,
    percentage: Math.max(0, Math.min(100, Math.round((timeLeft / denom) * 100))),
  }
}
