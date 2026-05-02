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

  const stop = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const start = useCallback(() => {
    if (timeLeft <= 0) return
    setIsRunning(true)
  }, [timeLeft])

  const reset = useCallback((newTime?: number) => {
    stop()
    setTimeLeft(newTime ?? initialSeconds)
  }, [stop, initialSeconds])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stop()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, stop])

  return {
    timeLeft,
    isRunning,
    start,
    stop,
    reset,
    percentage: Math.round((timeLeft / initialSeconds) * 100),
  }
}
