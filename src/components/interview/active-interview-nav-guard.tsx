'use client'

/**
 * Route-scoped active V2.1 interview navigation guard.
 *
 * While an interview is pending/in_progress (and not UI-completed), in-app
 * dashboard navigation (sidebar Links, logout) is intercepted. A blocked
 * attempt does NOT abandon and does NOT emit lifecycle milestones — it only
 * offers Continue vs open the existing Exit feedback flow.
 *
 * Browser beforeunload / history popstate are owned by the session page so
 * unload never invents abandon analytics.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ActiveInterviewNavGuardValue = {
  /** True while an active interview must not be left via ordinary nav. */
  isGuarding: boolean
  /**
   * Register/clear the session-page guard. Pass false to release (completion,
   * intentional leave, or boot redirect off the session).
   */
  setGuarding: (active: boolean) => void
  /** Open the session Exit / leave-feedback flow (does not abandon by itself). */
  registerOpenExitFlow: (open: (() => void) | null) => void
  /**
   * Intercept in-app navigation. Returns true when navigation was blocked.
   * Never abandons; never emits lifecycle events.
   */
  interceptNavigation: () => boolean
}

const ActiveInterviewNavGuardContext = createContext<ActiveInterviewNavGuardValue | null>(
  null,
)

export function ActiveInterviewNavGuardProvider({ children }: { children: ReactNode }) {
  const [isGuarding, setGuardingState] = useState(false)
  const [interceptOpen, setInterceptOpen] = useState(false)
  const openExitFlowRef = useRef<(() => void) | null>(null)

  const setGuarding = useCallback((active: boolean) => {
    setGuardingState(active)
    if (!active) setInterceptOpen(false)
  }, [])

  const registerOpenExitFlow = useCallback((open: (() => void) | null) => {
    openExitFlowRef.current = open
  }, [])

  const interceptNavigation = useCallback((): boolean => {
    if (!isGuarding) return false
    setInterceptOpen(true)
    return true
  }, [isGuarding])

  const handleContinue = useCallback(() => {
    setInterceptOpen(false)
  }, [])

  const handleExitInterview = useCallback(() => {
    setInterceptOpen(false)
    openExitFlowRef.current?.()
  }, [])

  const value = useMemo<ActiveInterviewNavGuardValue>(
    () => ({
      isGuarding,
      setGuarding,
      registerOpenExitFlow,
      interceptNavigation,
    }),
    [isGuarding, setGuarding, registerOpenExitFlow, interceptNavigation],
  )

  return (
    <ActiveInterviewNavGuardContext.Provider value={value}>
      {children}
      <Dialog
        open={interceptOpen}
        onOpenChange={(open) => {
          if (!open) setInterceptOpen(false)
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[min(100%-1.5rem,24rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
          aria-describedby="active-interview-nav-intercept-desc"
        >
          <DialogHeader className="space-y-2 border-b px-5 py-4 text-left sm:px-6">
            <DialogTitle className="font-heading text-lg font-semibold tracking-tight">
              Interview in progress
            </DialogTitle>
            <DialogDescription
              id="active-interview-nav-intercept-desc"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              You still have an interview open. Leaving through the app menu will not save
              progress as completed. Use Exit if you want to leave — that marks the interview
              as abandoned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button type="button" variant="outline" onClick={handleContinue}>
              Continue interview
            </Button>
            <Button type="button" variant="destructive" onClick={handleExitInterview}>
              Exit interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ActiveInterviewNavGuardContext.Provider>
  )
}

export function useActiveInterviewNavGuard(): ActiveInterviewNavGuardValue {
  const ctx = useContext(ActiveInterviewNavGuardContext)
  if (!ctx) {
    return {
      isGuarding: false,
      setGuarding: () => {},
      registerOpenExitFlow: () => {},
      interceptNavigation: () => false,
    }
  }
  return ctx
}

/**
 * Session-page registration: toggles guarding + wires Exit opener + browser
 * unload / history protection. Does not emit lifecycle events on unload.
 */
export function useRegisterActiveInterviewNavGuard(opts: {
  enabled: boolean
  onRequestExit: () => void
}): { releaseGuard: () => void } {
  const { enabled, onRequestExit } = opts
  const { setGuarding, registerOpenExitFlow, interceptNavigation } =
    useActiveInterviewNavGuard()
  const [released, setReleased] = useState(false)
  const active = enabled && !released

  useEffect(() => {
    setGuarding(active)
    return () => setGuarding(false)
  }, [active, setGuarding])

  useEffect(() => {
    if (!active) {
      registerOpenExitFlow(null)
      return
    }
    registerOpenExitFlow(onRequestExit)
    return () => registerOpenExitFlow(null)
  }, [active, onRequestExit, registerOpenExitFlow])

  // Prompt only — never abandon / never analytics.
  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])

  // Guard Back/Forward without inventing abandon. Re-push current URL and show intercept.
  useEffect(() => {
    if (!active) return
    const pushGuardState = () => {
      try {
        window.history.pushState({ ieActiveInterviewGuard: 1 }, '', window.location.href)
      } catch {
        // ignore
      }
    }
    pushGuardState()
    const onPopState = () => {
      pushGuardState()
      interceptNavigation()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [active, interceptNavigation])

  const releaseGuard = useCallback(() => {
    setReleased(true)
    setGuarding(false)
  }, [setGuarding])

  return { releaseGuard }
}
