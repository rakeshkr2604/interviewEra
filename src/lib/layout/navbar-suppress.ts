/**
 * Authenticated app + auth chrome routes where the marketing `<Navbar />`
 * must not render. Keep in sync with `(dashboard)/` top-level segments —
 * missing entries cause a double header (marketing Navbar over DashboardChrome)
 * and sticky-nav overlap on sidebar brand/streak.
 */
export const NAVBAR_SUPPRESS_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/interview',
  '/report',
  '/history',
  '/analytics',
  '/settings',
  '/upgrade',
  '/feedback',
  '/profile',
  '/admin',
  '/platform',
  '/college/dashboard',
  '/college/signup',
  '/notifications',
  '/readiness',
  '/roadmap',
  '/resume',
  '/prepare',
  '/welcome',
  '/coach',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
] as const

export function shouldSuppressNavbar(pathname: string): boolean {
  return NAVBAR_SUPPRESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
