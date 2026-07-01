import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  CalendarPlus,
  FileSearch,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Resume analysis',
    description: 'Check ATS compatibility',
    href: '/tools/ats-checker',
    icon: FileSearch,
  },
  {
    label: 'Mock interview',
    description: 'Start a new session',
    href: '/onboarding',
    icon: CalendarPlus,
  },
  {
    label: 'Analytics',
    description: 'See your progress',
    href: '/analytics',
    icon: BarChart2,
  },
  {
    label: 'Feedback',
    description: 'Share your thoughts',
    href: '/feedback',
    icon: MessageSquare,
  },
];

export function QuickActionsGrid() {
  return (
    <section className="dashboard-section" aria-labelledby="quick-actions-heading">
      <div className="mb-3 flex items-baseline gap-2 px-0.5 lg:mb-4">
        <div
          className="flex size-7 items-center justify-center rounded-lg lg:size-8"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--text-muted)',
          }}
        >
          <Zap size={14} aria-hidden />
        </div>
        <div>
          <h2 id="quick-actions-heading" className="dashboard-section-title !mt-0">
            Quick actions
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="dashboard-premium-card dashboard-premium-card--muted dashboard-hover-lift block min-h-[5.25rem] px-3 py-3 active:opacity-95 sm:min-h-0 sm:px-4 sm:py-4 lg:px-4 lg:py-4"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="mb-2.5 flex size-8 items-center justify-center rounded-lg"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  color: 'var(--text-muted)',
                }}
              >
                <Icon size={16} aria-hidden />
              </div>
              <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                {action.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
