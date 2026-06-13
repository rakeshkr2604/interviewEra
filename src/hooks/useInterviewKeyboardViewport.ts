'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks mobile virtual-keyboard overlap via visualViewport.
 * iOS Safari + Android Chrome shrink the layout viewport when the keyboard opens;
 * padding the control bar prevents the submit row from sitting under the keyboard.
 */
export function useInterviewKeyboardViewport(enabled: boolean): number {
  const [bottomInset, setBottomInset] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setBottomInset(Math.round(overlap))
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
      setBottomInset(0)
    }
  }, [enabled])

  return enabled ? bottomInset : 0
}
