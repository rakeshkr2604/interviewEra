import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, FileSearch, Map, Zap } from 'lucide-react';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Mock interview',
    description: 'Start a new session',
    href: getDefaultInterviewStartPath(),
    icon: CalendarPlus,
  },
  {
    label: 'Prep roadmap',
    description: 'Personalized topics and mocks',
    href: '/roadmap',
    icon: Map,
  },
  {
    label: 'ATS checker',
    description: 'Check resume compatibility',
    href: '/tools/ats-checker',
    icon: FileSearch,
  },
];

export function QuickActionsGrid() {
  const actions = QUICK_ACTIONS;

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

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="dashboard-premium-card dashboard-premium-card--muted dashboard-hover-lift flex min-h-11 items-center gap-3 px-3 py-3 active:opacity-95 sm:px-4 sm:py-4 lg:px-4 lg:py-4"
              style={{ textDecoration: 'none' }}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  color: 'var(--text-muted)',
                }}
              >
                <Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] leading-snug sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                  {action.description}
                </p>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
