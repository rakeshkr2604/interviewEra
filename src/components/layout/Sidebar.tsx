'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
  Sparkles,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import type { PlanTier } from '@/types/app.types'

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
      { href: '/history', label: 'Interview History', icon: History },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/analytics', label: 'Performance Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/upgrade', label: 'Pricing', icon: CreditCard },
      { href: '/admin/dashboard', label: 'Admin', icon: Shield },
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
  const router = useRouter()
  const [canAccessAdmin, setCanAccessAdmin] = useState(false)

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
      } = await supabase.auth.getUser()

      if (!user || !mounted) {
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
        items: section.items.filter((item) => item.href !== '/admin/dashboard' || canAccessAdmin),
      })),
    [canAccessAdmin],
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #6d28d9))',
            boxShadow: '0 12px 32px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
          }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p
            className="text-sm font-bold leading-none"
            style={{ color: 'var(--text-primary)', fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            InterviewEra
          </p>
          <p className="text-[10px] mt-0.5 font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Practice studio
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p
              className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.14em]"
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
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 72%, #6d28d9))'
                          : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isActive
                          ? '0 10px 28px color-mix(in srgb, var(--accent-primary) 28%, transparent)'
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
                      <Icon size={17} strokeWidth={2} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: Theme + Logout */}
      <div
        className="border-t px-3 py-4 space-y-2"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Theme
          </span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2
                     text-sm font-medium transition-all duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-danger)15'
            e.currentTarget.style.color = 'var(--accent-danger)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  )
}
