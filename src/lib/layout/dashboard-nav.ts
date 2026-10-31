/**
 * Dashboard sidebar section model (student shell).
 * Pure data + match helpers — Sidebar maps icons and renders UI.
 */

import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path'
import { COMMUNITY_HUB_PATH } from '@/lib/community/community'

export type DashboardNavLinkItem = {
  kind?: 'link'
  href: string
  label: string
  /** Stable key for icon lookup in the Sidebar. */
  icon: DashboardNavIconKey
  /** Narrow active match for dashboard home only. */
  exact?: boolean
}

export type DashboardNavComingSoonItem = {
  kind: 'comingSoon'
  id: string
  label: string
  icon: DashboardNavIconKey
  toastMessage: string
}

export type DashboardNavItem = DashboardNavLinkItem | DashboardNavComingSoonItem

export type DashboardNavSection = {
  id: string
  label: string
  /** When true, items render directly without a collapsible section header. */
  flat?: boolean
  /** When true, section header is non-interactive and items are always visible. */
  alwaysOpen?: boolean
  items: DashboardNavItem[]
}

export type DashboardNavIconKey =
  | 'dashboard'
  | 'play'
  | 'bookMarked'
  | 'bot'
  | 'fileText'
  | 'history'
  | 'listChecks'
  | 'scanSearch'
  | 'star'
  | 'sparkles'
  | 'filePenLine'
  | 'gauge'
  | 'barChart'
  | 'bell'
  | 'award'
  | 'settings'
  | 'creditCard'
  | 'shield'
  | 'users'

/** Defaults: keep daily workflow open; tuck infrequent sections. */
export const DEFAULT_DASHBOARD_SECTION_EXPANDED: Record<string, boolean> = {
  practice: true,
  tools: true,
  insights: true,
}

export const PINNED_DASHBOARD_NAV: DashboardNavLinkItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: 'dashboard',
  exact: true,
}

export function isDashboardNavLinkItem(
  item: DashboardNavItem,
): item is DashboardNavLinkItem {
  return item.kind !== 'comingSoon'
}

export function isDashboardNavItemActive(
  pathname: string,
  item: DashboardNavLinkItem,
): boolean {
  if (item.exact) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function dashboardSectionContainsActive(
  pathname: string,
  section: DashboardNavSection,
): boolean {
  return section.items.some(
    (item) => isDashboardNavLinkItem(item) && isDashboardNavItemActive(pathname, item),
  )
}

/**
 * Build collapsible sidebar sections for the student dashboard.
 * Interview Prep lives under Practice (with Start Interview); there is no Prepare category.
 */
export function buildDashboardNavSections(canAccessCoach = false): DashboardNavSection[] {
  const practiceItems: DashboardNavItem[] = [
    {
      href: getDefaultInterviewStartPath(),
      label: 'Start Interview',
      icon: 'play',
    },
    { href: '/prepare', label: 'Interview Prep', icon: 'bookMarked' },
  ]
  if (canAccessCoach) {
    practiceItems.push({ href: '/coach', label: 'Coach', icon: 'bot' })
  }
  practiceItems.push(
    { href: '/history', label: 'Interview History', icon: 'history' },
  )

  return [
    {
      id: 'practice',
      label: 'Practice',
      alwaysOpen: true,
      items: practiceItems,
    },
    {
      id: 'tools',
      label: 'Tools',
      alwaysOpen: true,
      items: [
        {
          href: '/tools/question-generator',
          label: 'Interview Question Generator',
          icon: 'listChecks',
        },
        { href: '/tools/ats-checker', label: 'ATS Resume Checker', icon: 'scanSearch' },
        { href: '/tools/star-builder', label: 'STAR Answer Builder', icon: 'star' },
        { href: '/tools/prompt-builder', label: 'Prompt Builder', icon: 'sparkles' },
        {
          kind: 'comingSoon',
          id: 'resume-builder',
          label: 'Resume Builder',
          icon: 'filePenLine',
          toastMessage: 'Coming soon — launching next week',
        },
      ],
    },
    {
      id: 'insights',
      label: 'Insights',
      items: [
        { href: '/readiness', label: 'Readiness & Roadmap', icon: 'gauge' },
        { href: '/analytics', label: 'Performance Analytics', icon: 'barChart' },
      ],
    },
    {
      id: 'misc',
      label: '',
      flat: true,
      items: [
        { href: COMMUNITY_HUB_PATH, label: 'Community Hub', icon: 'users' },
        { href: '/upgrade', label: 'Pricing', icon: 'creditCard' },
        { href: '/college/dashboard', label: 'Campus Admin', icon: 'shield' },
      ],
    },
  ]
}
