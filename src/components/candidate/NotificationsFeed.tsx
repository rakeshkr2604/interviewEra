'use client';

import Link from 'next/link';
import { Bell, FileText, Flame, GraduationCap, PlayCircle } from 'lucide-react';
import type { CandidateNotification } from '@/lib/candidate/types';
import { formatDateEnIn } from '@/lib/datetime/ist';

const ICONS = {
  interview_reminder: PlayCircle,
  resume_parsed: FileText,
  report_ready: FileText,
  invite_accepted: GraduationCap,
  practice_streak: Flame,
} as const;

export function NotificationsFeed({ notifications }: { notifications: CandidateNotification[] }) {
  if (notifications.length === 0) {
    return (
      <div
        className="dashboard-premium-card px-5 py-10 text-center"
        role="status"
        style={{ color: 'var(--text-muted)' }}
      >
        <Bell className="mx-auto mb-3 opacity-60" size={28} aria-hidden />
        <p className="text-sm">No notifications yet — complete a mock to get started.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Notifications">
      {notifications.map((item) => {
        const Icon = ICONS[item.type];
        const inner = (
          <>
            <div className="flex items-start gap-3">
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden style={{ color: 'var(--accent-primary)' }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                  {!item.read ? (
                    <span className="ms-2 inline-block size-2 rounded-full align-middle" style={{ background: 'var(--accent-primary)' }} aria-label="Unread" />
                  ) : null}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {formatDateEnIn(item.createdAt)}
                </p>
              </div>
            </div>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="dashboard-premium-card dashboard-hover-lift block min-h-11 px-4 py-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => {
                  if (item.type === 'interview_reminder') {
                    void import('@/lib/analytics/candidate-events').then(({ trackCandidateEvent }) =>
                      trackCandidateEvent('interview_resumed', { source: 'notifications' }),
                    );
                  }
                }}
              >
                {inner}
              </Link>
            ) : (
              <div className="dashboard-premium-card px-4 py-4">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
