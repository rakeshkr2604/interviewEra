'use client';

import { Users, BarChart2, Mail, Calendar } from 'lucide-react';
import type { ActivityEvent } from '@/lib/college/types';

const ICONS = {
  enrollment: Users,
  interview: BarChart2,
  invite: Mail,
  deadline: Calendar,
} as const;

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="dashboard-premium-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        No recent activity yet. Invite students to get started.
      </div>
    );
  }

  return (
    <div className="dashboard-premium-card overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--card-border)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </h3>
      </div>
      <ul>
        {events.map((event, index) => {
          const Icon = ICONS[event.type];
          return (
            <li
              key={event.id}
              className="flex items-start gap-3 px-5 py-3.5"
              style={{
                borderTop: index > 0 ? '1px solid var(--card-border)' : undefined,
              }}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}
              >
                <Icon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {event.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {event.description}
                </p>
              </div>
              <time
                className="shrink-0 text-xs"
                style={{ color: 'var(--text-muted)' }}
                dateTime={event.occurred_at}
              >
                {new Date(event.occurred_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
