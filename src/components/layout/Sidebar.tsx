'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Play,
  History,
  BarChart2,
  Settings,
  CreditCard,
  Shield,
  Award,
  FileText,
  Gauge,
  Map,
  Bell,
} from 'lucide-react'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { createClient } from '@/lib/supabase/client'
import { performClientLogout } from '@/lib/supabase/client-logout'
import type { PlanTier } from '@/types/app.types'
import { ThemeToggle } from './ThemeToggle'
import { StreakCounter } from './StreakCounter'
import { SidebarCommunityLinks } from '@/components/community/SidebarCommunityLinks'

const BRAND_MARK = '/brand/logos/icon-only.svg'

const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/onboarding', label: 'Start Interview', icon: Play },
    ],
  },
  {
    label: 'PRACTICE',
    items: [
      { href: '/resume', label: 'Resume', icon: FileText },
      { href: '/history', label: 'Interview History', icon: History },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/readiness', label: 'Readiness', icon: Gauge },
      { href: '/roadmap', label: 'Prep Roadmap', icon: Map },
      { href: '/analytics', label: 'Performance Analytics', icon: BarChart2 },
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/profile/badges', label: 'Badges', icon: Award },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/upgrade', label: 'Pricing', icon: CreditCard },
      { href: '/college/dashboard', label: 'Campus Admin', icon: Shield },
    ],
  },
]

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
} = {}) {
  const pathname = usePathname()
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true
    const run = (cb: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const id = window.requestIdleCallback(cb, { timeout: 1200 })
        return () => window.cancelIdleCallback(id)
      }
      const timeout = setTimeout(cb, 350)
      return () => clearTimeout(timeout)
    }

    async function loadAdminAccess() {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        const { signOutIfStaleAuth } = await import('@/lib/supabase/session')
        await signOutIfStaleAuth(supabase, error)
      }

      if (!user || !mounted || error) {
        setCanAccessAdmin(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('plan_tier')
        .eq('id', user.id)
        .maybeSingle()

      const tier = profile?.plan_tier as PlanTier | undefined
      if (mounted) {
        setCanAccessAdmin(tier === 'campus_admin')
      }
    }

    const cancel = run(() => {
      void loadAdminAccess()
    })

    return () => {
      cancel()
      mounted = false
    }
  }, [])

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href !== '/college/dashboard' || canAccessAdmin),
      })),
    [canAccessAdmin],
  )

  const handleLogout = () => {
    if (loggingOut) return
    setLoggingOut(true)
    onNavigate?.()
    void performClientLogout({ redirectTo: '/login' })
  }

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto',
        className,
      )}
      style={{
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <Image
          src={BRAND_MARK}
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-2xl"
          style={{
            boxShadow: '0 6px 22px color-mix(in srgb, var(--accent-primary) 22%, transparent)',
          }}
          alt=""
        />
        <div>
          <p className="text-[15px] leading-tight" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            <BrandWordmarkSplit interviewClassName="font-semibold" eraClassName="font-bold" />
          </p>
          <p
            className="mt-1 text-[11px] font-medium tracking-wide"
            style={{ color: 'color-mix(in srgb, var(--text-muted) 78%, var(--text-secondary))' }}
          >
            Practice studio
          </p>
          <div className="mt-3">
            <StreakCounter className="w-fit max-w-full" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3.5 px-2.5 py-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={
              sectionIndex > 0
                ? 'mt-2 border-t border-[var(--card-border)]/55 pt-3'
                : undefined
            }
          >
            <p
              className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold leading-snug transition-none"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))'
                          : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isActive
                          ? '0 6px 20px color-mix(in srgb, var(--accent-primary) 17%, transparent)'
                          : 'none',
                      }}
                      onClick={() => onNavigate?.()}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }
                      }}
                    >
                      <Icon size={18} strokeWidth={2.25} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <SidebarCommunityLinks onNavigate={onNavigate} />
      </nav>

      {/* Bottom: Theme + Logout */}
      <div
        className="border-t px-3 pt-4 space-y-2"
        style={{ borderColor: 'var(--card-border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Theme
          </span>
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2
                     text-sm font-medium transition-none disabled:pointer-events-none disabled:opacity-50"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            if (loggingOut) return
            e.currentTarget.style.background = 'var(--accent-danger)15'
            e.currentTarget.style.color = 'var(--accent-danger)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <Image
            src={BRAND_MARK}
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-lg"
            alt=""
            aria-hidden
          />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}
