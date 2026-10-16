import { describe, expect, it } from 'vitest'
import {
  NAVBAR_SUPPRESS_PREFIXES,
  shouldSuppressNavbar,
} from '@/lib/layout/navbar-suppress'

describe('navbar-suppress', () => {
  it('suppresses dashboard chrome routes that previously double-rendered the marketing nav', () => {
    for (const path of ['/prepare', '/welcome', '/coach', '/settings/billing']) {
      expect(shouldSuppressNavbar(path), path).toBe(true)
    }
  })

  it('does not suppress public marketing routes', () => {
    for (const path of ['/', '/pricing', '/interview-questions', '/blog']) {
      expect(shouldSuppressNavbar(path), path).toBe(false)
    }
  })

  it('includes every authenticated app top-level segment that uses DashboardChrome', () => {
    const required = [
      '/dashboard',
      '/prepare',
      '/welcome',
      '/coach',
      '/settings',
      '/upgrade',
      '/history',
      '/analytics',
      '/resume',
      '/readiness',
      '/roadmap',
      '/notifications',
      '/feedback',
      '/profile',
      '/interview',
      '/report',
      '/onboarding',
    ]
    for (const prefix of required) {
      expect(NAVBAR_SUPPRESS_PREFIXES).toContain(prefix)
    }
  })
})
