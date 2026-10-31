import Link from 'next/link';
import { Award, BarChart2, CalendarDays, History, MessageSquare, Settings } from 'lucide-react';

const LINKS = [
  { href: '/history', label: 'History', description: 'Review past sessions', icon: History },
  { href: '/analytics', label: 'Analytics', description: 'Performance over time', icon: BarChart2 },
  { href: '/profile/badges', label: 'Badges', description: 'Streaks & achievements', icon: Award },
  { href: '/settings', label: 'Settings', description: 'Account & preferences', icon: Settings },
] as const;

export function DashboardAccountLinksCard({ memberSince }: { memberSince: string }) {
  return (
    <section
      className="dashboard-premium-card flex flex-1 flex-col justify-center px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6"
      aria-labelledby="account-links-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="account-links-heading" className="dashboard-section-title !mt-0 text-base sm:text-lg">
          Your account
        </h2>
        {memberSince ? (
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <CalendarDays size={13} className="shrink-0 opacity-70" aria-hidden />
            Member since {memberSince}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="dashboard-hover-lift flex min-h-11 items-center gap-3 rounded-xl border px-3 py-3"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
              textDecoration: 'none',
            }}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}
              aria-hidden
            >
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {label}
              </span>
              <span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/feedback"
        className="dashboard-hover-lift mt-2.5 flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
        }}
      >
        <MessageSquare size={16} aria-hidden />
        Give feedback
      </Link>
    </section>
  );
}
