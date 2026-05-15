'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  LayoutGrid,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { createClient } from '@/lib/supabase/client'

interface CampusSidebarProps {
  orgName: string
  seatCount: number
  seatsUsed: number
  onNavigate?: () => void
}

const NAV_SECTIONS = [
  {
    label: 'CAMPUS',
    items: [
      { href: '/college/dashboard', label: 'Overview', icon: Home, exact: true },
      { href: '/college/dashboard/students', label: 'Students', icon: Users },
      { href: '/college/dashboard/deadlines', label: 'Deadlines', icon: Calendar },
      { href: '/college/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { href: '/college/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  const [hovered, setHovered] = useState(false)

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-current={isActive ? 'page' : undefined}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold leading-snug transition-none"
        style={
          isActive
            ? {
                background:
                  'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
                color: '#ffffff',
                boxShadow:
                  '0 6px 20px color-mix(in srgb, var(--accent-primary) 17%, transparent)',
              }
            : hovered
              ? {
                  background:
                    'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  color: 'var(--text-primary)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                }
        }
      >
        <Icon
          size={18}
          strokeWidth={2.25}
          style={{ color: isActive ? '#fff' : hovered ? 'var(--text-primary)' : 'var(--text-muted)' }}
        />
        {label}
      </Link>
    </li>
  )
}

function OrgAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
      style={{
        background:
          'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
        boxShadow:
          '0 6px 22px color-mix(in srgb, var(--accent-primary) 22%, transparent)',
      }}
    >
      {initials}
    </div>
  )
}

export function CampusSidebar({
  orgName,
  seatCount,
  seatsUsed,
  onNavigate,
}: CampusSidebarProps) {
  const router = useRouter()
  const [logoutHovered, setLogoutHovered] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const seatsRemaining = seatCount - seatsUsed
  const seatPct = seatCount > 0 ? Math.round((seatsUsed / seatCount) * 100) : 0

  return (
    <aside
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Org branding */}
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <OrgAvatar name={orgName} />
        <div className="min-w-0">
          <p
            className="truncate text-[14px] font-semibold leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {orgName}
          </p>
          <p
            className="mt-0.5 text-[11px] font-medium tracking-wide"
            style={{ color: 'color-mix(in srgb, var(--text-muted) 78%, var(--text-secondary))' }}
          >
            T&amp;P Officer Dashboard
          </p>
          {/* Seat meter */}
          <div className="mt-2.5 space-y-1">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--card-border)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${seatPct}%`,
                  background:
                    seatPct > 85
                      ? 'var(--accent-warning)'
                      : 'var(--accent-primary)',
                }}
              />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {seatsUsed}/{seatCount} seats &middot;{' '}
              <span style={{ color: seatsRemaining < 10 ? 'var(--accent-warning)' : 'inherit' }}>
                {seatsRemaining} remaining
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3.5 px-2.5 py-4">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={
              sectionIndex > 0
                ? 'mt-2 border-t pt-3'
                : undefined
            }
            style={sectionIndex > 0 ? { borderColor: 'color-mix(in srgb, var(--card-border) 55%, transparent)' } : undefined}
          >
            <p
              className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'color-mix(in srgb, var(--text-muted) 52%, transparent)' }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  exact={'exact' in item ? item.exact : false}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: Student Mode + Theme + Logout */}
      <div
        className="border-t px-3 pt-4 space-y-2"
        style={{ borderColor: 'var(--card-border)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Student Mode quick link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-none"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
            e.currentTarget.style.color = 'var(--accent-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <LayoutGrid size={16} strokeWidth={2} />
          Student Mode
        </Link>

        {/* Theme toggle row */}
        <div className="flex items-center justify-between px-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Theme
          </span>
          <ThemeToggle />
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-none"
          style={{
            background: logoutHovered
              ? 'color-mix(in srgb, var(--accent-danger) 12%, transparent)'
              : 'transparent',
            color: logoutHovered ? 'var(--accent-danger)' : 'var(--text-secondary)',
          }}
        >
          <LogOut size={16} strokeWidth={2} />
          Log out
        </button>
      </div>
    </aside>
  )
}
