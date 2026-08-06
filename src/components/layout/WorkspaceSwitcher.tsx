'use client';

import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  LayoutDashboard,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkspaceSwitcherCurrent = 'student' | 'campus' | 'hiring' | 'platform';

const WORKSPACES: {
  id: WorkspaceSwitcherCurrent;
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'student', href: '/dashboard', label: 'Student', icon: LayoutDashboard },
  { id: 'campus', href: '/college/dashboard', label: 'Campus', icon: GraduationCap },
  { id: 'hiring', href: '/hiring/dashboard', label: 'Hiring Teams', icon: Building2 },
  { id: 'platform', href: '/platform/growth', label: 'Funnel Dashboard', icon: TrendingUp },
];

type WorkspaceSwitcherProps = {
  current: WorkspaceSwitcherCurrent;
  onNavigate?: () => void;
  className?: string;
};

/**
 * Platform-admin only — switch Student / Campus / Hiring / Funnel from one place.
 */
export function WorkspaceSwitcher({ current, onNavigate, className }: WorkspaceSwitcherProps) {
  return (
    <div className={cn('space-y-1', className)} aria-label="Workspace switcher">
      <p
        className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'color-mix(in srgb, var(--text-muted) 70%, transparent)' }}
      >
        Workspaces
      </p>
      <ul className="space-y-0.5" role="list">
        {WORKSPACES.map(({ id, href, label, icon: Icon }) => {
          const active = current === id;
          return (
            <li key={id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-none"
                style={
                  active
                    ? {
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--accent-primary) 8%, transparent)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  if (active) {
                    e.currentTarget.style.background =
                      'color-mix(in srgb, var(--accent-primary) 14%, transparent)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                    return;
                  }
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Icon size={16} strokeWidth={2.25} className="shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
