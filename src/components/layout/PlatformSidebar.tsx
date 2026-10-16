'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  LogOut,
  MessageSquare,
  TrendingUp,
  Wrench,
  Gift,
  Building2,
  Bot,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { BrandMarkIcon } from '@/components/brand/BrandMarkIcon';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { performClientLogout } from '@/lib/supabase/client-logout';

const NAV_ITEMS = [
  { href: '/platform/growth', label: 'Growth', icon: TrendingUp, exact: false },
  { href: '/platform/analytics', label: 'Analytics', icon: BarChart3, exact: false },
  { href: '/platform/rewards', label: 'Rewards', icon: Gift, exact: false },
  { href: '/platform/feedback', label: 'Feedback', icon: MessageSquare, exact: false },
  { href: '/platform/free-tools', label: 'Free Tools', icon: Wrench, exact: false },
] as const;

const SYSTEM_ITEMS = [
  { href: '/platform/campus-approvals', label: 'Campus Approvals', icon: Building2, exact: false },
  { href: '/platform/campus-page', label: 'Campus page', icon: GraduationCap, exact: false },
  { href: '/platform/coach', label: 'AI Interview Coach', icon: Bot, exact: false },
  { href: '/platform/hiring-teams', label: 'Hiring Teams page', icon: Briefcase, exact: false },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const [hovered, setHovered] = useState(false);

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
                  background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
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
  );
}

export function PlatformSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    onNavigate?.();
    void performClientLogout({ redirectTo: '/login' });
  };

  return (
    <aside
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <BrandMarkIcon size={44} className="size-11" />
        <p
          className="text-[15px] leading-tight"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          <BrandWordmarkSplit interviewClassName="font-semibold" eraClassName="font-bold" />
        </p>
      </div>

      <nav className="flex-1 px-2.5 py-4">
        <p
          className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: 'color-mix(in srgb, var(--text-muted) 52%, transparent)' }}
        >
          Insights
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} onNavigate={onNavigate} />
          ))}
        </ul>
        <p
          className="mb-1.5 mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: 'color-mix(in srgb, var(--text-muted) 52%, transparent)' }}
        >
          System
        </p>
        <ul className="space-y-0.5">
          {SYSTEM_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>

      <div
        className="space-y-2 border-t px-3 pt-4"
        style={{
          borderColor: 'var(--card-border)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <WorkspaceSwitcher current="platform" onNavigate={onNavigate} className="pb-1" />
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Theme
          </span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          onMouseEnter={() => !loggingOut && setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-none disabled:pointer-events-none disabled:opacity-50"
          style={{
            background: logoutHovered
              ? 'color-mix(in srgb, var(--accent-danger) 12%, transparent)'
              : 'transparent',
            color: logoutHovered ? 'var(--accent-danger)' : 'var(--text-secondary)',
          }}
        >
          <LogOut size={16} strokeWidth={2} />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </aside>
  );
}
