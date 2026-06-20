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
  accent: 'primary' | 'success';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Resume analysis',
    description: 'Check ATS compatibility',
    href: '/tools/ats-checker',
    icon: FileSearch,
    accent: 'primary',
  },
  {
    label: 'Mock interview',
    description: 'Start a new session',
    href: '/onboarding',
    icon: CalendarPlus,
    accent: 'success',
  },
  {
    label: 'Analytics',
    description: 'See your progress',
    href: '/analytics',
    icon: BarChart2,
    accent: 'primary',
  },
  {
    label: 'Feedback',
    description: 'Share your thoughts',
    href: '/feedback',
    icon: MessageSquare,
    accent: 'success',
  },
];

export function QuickActionsGrid() {
  return (
    <section className="mb-4 sm:mb-5 lg:mb-8">
      <div className="mb-3 flex items-center gap-2 px-0.5 lg:mb-4">
        <div
          className="flex size-7 items-center justify-center rounded-lg lg:size-8"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Zap size={14} aria-hidden />
        </div>
        <h2 className="text-base font-semibold lg:text-lg" style={{ color: 'var(--text-primary)' }}>
          Quick actions
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.accent === 'primary';
          return (
            <Link
              key={action.label}
              href={action.href}
              className="dashboard-premium-card dashboard-hover-lift block min-h-[5.25rem] px-3 py-3 transition-all duration-200 active:opacity-95 sm:min-h-0 sm:px-4 sm:py-4 lg:px-4 lg:py-4"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="mb-2.5 flex size-9 items-center justify-center rounded-xl"
                style={{
                  background: isPrimary
                    ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
                    : 'color-mix(in srgb, var(--accent-success) 14%, transparent)',
                  color: isPrimary ? 'var(--accent-primary)' : 'var(--accent-success)',
                }}
              >
                <Icon size={18} aria-hidden />
              </div>
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
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
