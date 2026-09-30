'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from 'react'
import { toast } from 'sonner'
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
  ChevronDown,
  ListChecks,
  ScanSearch,
  Star,
  FilePenLine,
  Users,
  Bot,
} from 'lucide-react'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { performClientLogout } from '@/lib/supabase/client-logout'
import { ThemeToggle } from './ThemeToggle'
import { StreakCounter } from './StreakCounter'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { COMMUNITY_HUB_PATH } from '@/lib/community/community'
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path'
import { useActiveInterviewNavGuard } from '@/components/interview/active-interview-nav-guard'

const BRAND_MARK = '/brand/logos/icon-only.svg'
const SIDEBAR_EXPANDED_STORAGE_KEY = 'ie:sidebar-sections-expanded'
const SIDEBAR_EXPANDED_EVENT = 'ie:sidebar-sections-expanded'

type NavIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

type NavLinkItem = {
  kind?: 'link'
  href: string
  label: string
  icon: NavIcon
  /** Narrow active match for dashboard home only. */
  exact?: boolean
}

type NavComingSoonItem = {
  kind: 'comingSoon'
  id: string
  label: string
  icon: NavIcon
  toastMessage: string
}

type NavItem = NavLinkItem | NavComingSoonItem

type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

/** Defaults: keep daily workflow open; tuck infrequent sections. */
const DEFAULT_SECTION_EXPANDED: Record<string, boolean> = {
  practice: true,
  tools: true,
  insights: false,
  account: false,
  community: false,
}

const PINNED_DASHBOARD: NavLinkItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  exact: true,
}

function buildNavSections(canAccessCoach = false): NavSection[] {
  const practiceItems: NavItem[] = [
    { href: getDefaultInterviewStartPath(), label: 'Start Interview', icon: Play },
  ]
  if (canAccessCoach) {
    practiceItems.push({ href: '/coach', label: 'Coach', icon: Bot })
  }
  practiceItems.push(
    { href: '/resume', label: 'Resume', icon: FileText },
    { href: '/history', label: 'Interview History', icon: History },
  )

  return [
    {
      id: 'practice',
      label: 'Practice',
      items: practiceItems,
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        {
          href: '/tools/question-generator',
          label: 'Interview Question Generator',
          icon: ListChecks,
        },
        { href: '/tools/ats-checker', label: 'ATS Resume Checker', icon: ScanSearch },
        { href: '/tools/star-builder', label: 'STAR Answer Builder', icon: Star },
        {
          kind: 'comingSoon',
          id: 'resume-builder',
          label: 'Resume Builder',
          icon: FilePenLine,
          toastMessage: 'Coming soon — launching next week',
        },
      ],
    },
    {
      id: 'insights',
      label: 'Insights',
      items: [
        { href: '/readiness', label: 'Readiness', icon: Gauge },
        { href: '/roadmap', label: 'Prep Roadmap', icon: Map },
        { href: '/analytics', label: 'Performance Analytics', icon: BarChart2 },
        { href: '/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      items: [
        { href: '/profile/badges', label: 'Badges', icon: Award },
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/upgrade', label: 'Pricing', icon: CreditCard },
        { href: '/college/dashboard', label: 'Campus Admin', icon: Shield },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [{ href: COMMUNITY_HUB_PATH, label: 'Community Hub', icon: Users }],
    },
  ]
}

function isLinkItem(item: NavItem): item is NavLinkItem {
  return item.kind !== 'comingSoon'
}

function isItemActive(pathname: string, item: NavLinkItem): boolean {
  if (item.exact) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function sectionContainsActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isLinkItem(item) && isItemActive(pathname, item))
}

function readStoredExpanded(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const out: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      // Drop removed categories (e.g. former "main") so prefs stay clean.
      if (!(key in DEFAULT_SECTION_EXPANDED)) continue
      if (typeof value === 'boolean') out[key] = value
    }
    return out
  } catch {
    return null
  }
}

/** Cached for referential stability — `useSyncExternalStore` requires it. */
let expandedSnapshotCache: Record<string, boolean> | null = null

function buildExpandedSnapshot(): Record<string, boolean> {
  return { ...DEFAULT_SECTION_EXPANDED, ...readStoredExpanded() }
}

function invalidateExpandedSnapshotCache(): void {
  expandedSnapshotCache = null
}

function writeStoredExpanded(state: Record<string, boolean>): void {
  try {
    const cleaned: Record<string, boolean> = {}
    for (const key of Object.keys(DEFAULT_SECTION_EXPANDED)) {
      if (typeof state[key] === 'boolean') cleaned[key] = state[key]
    }
    localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, JSON.stringify(cleaned))
    invalidateExpandedSnapshotCache()
    window.dispatchEvent(new Event(SIDEBAR_EXPANDED_EVENT))
  } catch {
    // private mode / quota — ignore
  }
}

function getExpandedSnapshot(): Record<string, boolean> {
  if (expandedSnapshotCache === null) {
    expandedSnapshotCache = buildExpandedSnapshot()
  }
  return expandedSnapshotCache
}

function getServerExpandedSnapshot(): Record<string, boolean> {
  return DEFAULT_SECTION_EXPANDED
}

function subscribeExpanded(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_EXPANDED_STORAGE_KEY) {
      invalidateExpandedSnapshotCache()
      onStoreChange()
    }
  }
  const onLocal = () => {
    // writeStoredExpanded already invalidated the cache
    onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(SIDEBAR_EXPANDED_EVENT, onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SIDEBAR_EXPANDED_EVENT, onLocal)
  }
}

function useSidebarSectionExpanded(): [
  Record<string, boolean>,
  (sectionId: string) => void,
] {
  const expanded = useSyncExternalStore(
    subscribeExpanded,
    getExpandedSnapshot,
    getServerExpandedSnapshot,
  )

  const toggleSection = useCallback((sectionId: string) => {
    const current = getExpandedSnapshot()
    const next = {
      ...current,
      [sectionId]: !(current[sectionId] ?? DEFAULT_SECTION_EXPANDED[sectionId] ?? true),
    }
    writeStoredExpanded(next)
  }, [])

  return [expanded, toggleSection]
}

function NavLinkRow({
  item,
  active,
  onNavigate,
  navigationLocked = false,
  onNavigationBlocked,
}: {
  item: NavLinkItem
  active: boolean
  onNavigate?: () => void
  /** Active interview: Links stay visible but navigation is intercepted. */
  navigationLocked?: boolean
  onNavigationBlocked?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-disabled={navigationLocked || undefined}
      title={navigationLocked ? 'Interview in progress' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold leading-snug transition-none',
        navigationLocked && 'cursor-not-allowed opacity-60',
      )}
      style={{
        background: active
          ? 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))'
          : 'transparent',
        color: active ? '#ffffff' : 'var(--text-secondary)',
        boxShadow: active
          ? '0 6px 20px color-mix(in srgb, var(--accent-primary) 17%, transparent)'
          : 'none',
      }}
      onClick={(e) => {
        if (navigationLocked) {
          e.preventDefault()
          e.stopPropagation()
          onNavigationBlocked?.()
          return
        }
        onNavigate?.()
      }}
      onMouseEnter={(e) => {
        if (navigationLocked || active) return
        e.currentTarget.style.background =
          'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        if (active) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      <Icon size={18} strokeWidth={2.25} className="shrink-0" />
      <span className="min-w-0">{item.label}</span>
    </Link>
  )
}

function ComingSoonRow({ item }: { item: NavComingSoonItem }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold leading-snug transition-none"
      style={{ color: 'var(--text-muted)' }}
      aria-label={`${item.label}, coming soon`}
      onClick={() => {
        toast.message(item.toastMessage)
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'color-mix(in srgb, var(--text-muted) 10%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon size={18} strokeWidth={2.25} className="shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">{item.label}</span>
      <span
        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
        style={{
          background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
          color: 'var(--accent-warning)',
        }}
      >
        Soon
      </span>
    </button>
  )
}

export function Sidebar({
  className,
  onNavigate,
  initialStreak,
  canAccessAdmin,
  showWorkspaceSwitcher = false,
  canAccessCoach = false,
}: {
  className?: string
  onNavigate?: () => void
  initialStreak: number
  canAccessAdmin: boolean
  showWorkspaceSwitcher?: boolean
  canAccessCoach?: boolean
}) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [expanded, toggleSection] = useSidebarSectionExpanded()
  const { isGuarding, interceptNavigation } = useActiveInterviewNavGuard()

  const sections = useMemo(
    () =>
      buildNavSections(canAccessCoach).map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !isLinkItem(item) || item.href !== '/college/dashboard' || canAccessAdmin,
        ),
      })),
    [canAccessAdmin, canAccessCoach],
  )

  const handleLogout = () => {
    if (loggingOut) return
    if (interceptNavigation()) return
    setLoggingOut(true)
    onNavigate?.()
    void performClientLogout({ redirectTo: '/login' })
  }

  const handleNavAttempt = () => {
    if (interceptNavigation()) return
    onNavigate?.()
  }

  return (
    <aside
      className={cn('flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto', className)}
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
          <p
            className="text-[15px] leading-tight"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            <BrandWordmarkSplit interviewClassName="font-semibold" eraClassName="font-bold" />
          </p>
          <p
            className="mt-1 text-[11px] font-medium tracking-wide"
            style={{ color: 'color-mix(in srgb, var(--text-muted) 78%, var(--text-secondary))' }}
          >
            Practice studio
          </p>
          <div className="mt-3">
            <StreakCounter
              key={initialStreak}
              className="w-fit max-w-full"
              initialStreak={initialStreak}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2.5 py-4" aria-label="Dashboard">
        <div className="mb-1.5 border-b border-[var(--card-border)]/55 pb-2.5">
          <NavLinkRow
            item={PINNED_DASHBOARD}
            active={isItemActive(pathname, PINNED_DASHBOARD)}
            onNavigate={handleNavAttempt}
            navigationLocked={isGuarding}
            onNavigationBlocked={() => {
              interceptNavigation()
            }}
          />
        </div>

        {sections.map((section, sectionIndex) => {
          const panelId = `sidebar-section-${section.id}`
          const isOpen = expanded[section.id] ?? DEFAULT_SECTION_EXPANDED[section.id] ?? true
          const hasActiveChild = sectionContainsActive(pathname, section)

          return (
            <div
              key={section.id}
              className={
                sectionIndex > 0
                  ? 'mt-1.5 border-t border-[var(--card-border)]/55 pt-2'
                  : undefined
              }
            >
              <button
                type="button"
                id={`${panelId}-trigger`}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-none"
                style={{ color: 'var(--text-muted)' }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleSection(section.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {section.label}
                  </span>
                  {!isOpen && hasActiveChild ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--accent-primary)' }}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  className={cn(
                    'shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                    isOpen ? 'rotate-0' : '-rotate-90',
                  )}
                  aria-hidden
                />
              </button>

              <ul
                id={panelId}
                role="list"
                hidden={!isOpen}
                className="space-y-0.5"
                aria-labelledby={`${panelId}-trigger`}
              >
                {section.items.map((item) => {
                  if (!isLinkItem(item)) {
                    return (
                      <li key={item.id}>
                        <ComingSoonRow item={item} />
                      </li>
                    )
                  }

                  const active = isItemActive(pathname, item)
                  return (
                    <li key={item.href}>
                      <NavLinkRow
                        item={item}
                        active={active}
                        onNavigate={handleNavAttempt}
                        navigationLocked={isGuarding}
                        onNavigationBlocked={() => {
                          interceptNavigation()
                        }}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Bottom: Workspaces (platform admin) + Theme + Logout */}
      <div
        className="space-y-2 border-t px-3 pt-4"
        style={{
          borderColor: 'var(--card-border)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {showWorkspaceSwitcher ? (
          <WorkspaceSwitcher current="student" onNavigate={onNavigate} className="pb-1" />
        ) : null}

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
