'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Search, Settings } from 'lucide-react'
import { UserAvatar } from '@/components/profile/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path'
import { createClient } from '@/lib/supabase/client'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

const SEARCH_DESTINATIONS = [
  { label: 'Start a mock interview', href: getDefaultInterviewStartPath(), keywords: 'mock interview practice session' },
  { label: 'Prep roadmap', href: '/roadmap', keywords: 'roadmap topics plan recommendations' },
  { label: 'Readiness score', href: '/readiness', keywords: 'readiness score insights' },
  { label: 'Performance analytics', href: '/analytics', keywords: 'analytics charts progress' },
  { label: 'Interview history', href: '/history', keywords: 'history past sessions' },
  { label: 'ATS resume checker', href: '/tools/ats-checker', keywords: 'ats checker tool resume' },
  { label: 'Interview question generator', href: '/tools/question-generator', keywords: 'question generator tool' },
  { label: 'STAR answer builder', href: '/tools/star-builder', keywords: 'star answer builder tool' },
  { label: 'Notifications', href: '/notifications', keywords: 'notifications alerts' },
  { label: 'Badges', href: '/profile/badges', keywords: 'badges achievements streak' },
  { label: 'Settings', href: '/settings', keywords: 'settings account profile' },
] as const

function DashboardSearchBox() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return SEARCH_DESTINATIONS.filter(
      (d) => d.label.toLowerCase().includes(q) || d.keywords.includes(q),
    ).slice(0, 6)
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
        aria-hidden
      />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) go(matches[0].href)
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search for topics, tools, or mock interviews..."
        aria-label="Search dashboard"
        className={`h-10 w-full rounded-xl border bg-transparent pl-9 pr-3 text-sm outline-none ${IE_FOCUS_VISIBLE}`}
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      />
      {open && matches.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border shadow-lg"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          {matches.map((m) => (
            <button
              key={m.href}
              type="button"
              onClick={() => go(m.href)}
              className="block w-full px-3.5 py-2.5 text-left text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const LS_READ_KEY = 'ie_read_notifications'

function getReadIdsFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_READ_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function NotificationBell() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/candidate/notifications-count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (cancelled || !data || typeof data.count !== 'number') return
        // Subtract locally-read notifications from the server count.
        const readCount = getReadIdsFromStorage().size
        setCount(Math.max(0, data.count - readCount))
      })
      .catch(() => {
        // Badge is a nicety — silently skip on failure, bell still links out.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onCountUpdate(e: Event) {
      const detail = (e as CustomEvent<{ count: number }>).detail
      if (typeof detail?.count === 'number') setCount(detail.count)
    }
    window.addEventListener('ie:notif:count', onCountUpdate)
    return () => window.removeEventListener('ie:notif:count', onCountUpdate)
  }, [])

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:opacity-80 ${IE_FOCUS_VISIBLE}`}
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
      aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <Bell className="size-[18px]" aria-hidden />
      {count != null && count > 0 ? (
        <span
          className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: 'var(--accent-danger)' }}
          aria-hidden
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  )
}

function AvatarDropdown({
  displayName,
  email,
  avatarPath,
  oauthPictureUrl,
}: {
  displayName: string
  email: string
  avatarPath: string | null
  oauthPictureUrl: string | null
}) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className={`flex shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 outline-none transition-colors hover:opacity-80 ${IE_FOCUS_VISIBLE}`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <UserAvatar name={displayName} email={email} avatarPath={avatarPath} oauthPictureUrl={oauthPictureUrl} size="sm" />
        <span className="hidden text-sm font-medium sm:inline" style={{ color: 'var(--text-primary)' }}>
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ width: 'auto', minWidth: '200px' }}>
        <div className="truncate px-1.5 py-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')} className="flex cursor-pointer items-center gap-2">
          <Settings className="size-4" aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleSignOut()}
          className="flex cursor-pointer items-center gap-2"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DashboardTopBar({
  displayName,
  email,
  avatarPath,
  oauthPictureUrl,
}: {
  displayName: string
  email: string
  avatarPath: string | null
  oauthPictureUrl: string | null
}) {
  return (
    <header
      className="sticky top-0 z-20 hidden items-center gap-4 px-6 py-3 lg:flex"
      aria-label="Dashboard top bar"
    >
      <DashboardSearchBox />
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <NotificationBell />
        <AvatarDropdown
          displayName={displayName}
          email={email}
          avatarPath={avatarPath}
          oauthPictureUrl={oauthPictureUrl}
        />
      </div>
    </header>
  )
}
