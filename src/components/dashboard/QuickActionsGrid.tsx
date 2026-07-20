import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  CalendarPlus,
  FileSearch,
  FileText,
  Gauge,
  Map,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

function buildQuickActions(resumeCompletionPct: number): QuickAction[] {
  return [
    {
      label: 'Resume workspace',
      description:
        resumeCompletionPct >= 100
          ? 'Resume ready — review or replace'
          : `${resumeCompletionPct}% complete — upload to improve`,
      href: '/resume',
      icon: FileText,
    },
    {
      label: 'Readiness score',
      description: 'See placement readiness breakdown',
      href: '/readiness',
      icon: Gauge,
    },
    {
      label: 'Prep roadmap',
      description: 'Personalized topics and mocks',
      href: '/roadmap',
      icon: Map,
    },
    {
      label: 'Mock interview',
      description: 'Start a new session',
      href: getDefaultInterviewStartPath(),
      icon: CalendarPlus,
    },
    {
      label: 'ATS checker',
      description: 'Check resume compatibility',
      href: '/tools/ats-checker',
      icon: FileSearch,
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
}

export function QuickActionsGrid({ resumeCompletionPct = 0 }: { resumeCompletionPct?: number }) {
  const actions = buildQuickActions(resumeCompletionPct);

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
        {actions.map((action) => {
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
