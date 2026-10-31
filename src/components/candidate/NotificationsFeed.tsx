'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart2, Bell, FileText, Flame, GraduationCap, PlayCircle } from 'lucide-react';
import type { CandidateNotification } from '@/lib/candidate/types';
import { formatDateEnIn } from '@/lib/datetime/ist';
import { requestInterviewResume } from '@/lib/interview/request-interview-resume';

const LS_KEY = 'ie_read_notifications';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable — silently ignore
  }
}

const ICONS = {
  interview_reminder: PlayCircle,
  resume_parsed: FileText,
  report_ready: BarChart2,
  invite_accepted: GraduationCap,
  practice_streak: Flame,
} as const;

function NotificationBody({
  item,
  isRead,
}: {
  item: CandidateNotification;
  isRead: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {(() => {
        const Icon = ICONS[item.type];
        return (
          <Icon
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden
            style={{ color: isRead ? 'var(--text-muted)' : 'var(--accent-primary)' }}
          />
        );
      })()}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold"
          style={{ color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {item.title}
          {!isRead ? (
            <span
              className="ms-2 inline-block size-2 rounded-full align-middle"
              style={{ background: 'var(--accent-primary)' }}
              aria-label="Unread"
            />
          ) : null}
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {item.body}
        </p>
        {item.ctaLabel ? (
          <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            {item.ctaLabel} →
          </p>
        ) : null}
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {formatDateEnIn(item.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function NotificationsFeed({ notifications }: { notifications: CandidateNotification[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      const remaining = notifications.filter((n) => !n.read && !next.has(n.id)).length;
      window.dispatchEvent(new CustomEvent('ie:notif:count', { detail: { count: remaining } }));
      return next;
    });
  }

  function markAllRead() {
    const allIds = new Set(notifications.map((n) => n.id));
    saveReadIds(allIds);
    setReadIds(allIds);
    window.dispatchEvent(new CustomEvent('ie:notif:count', { detail: { count: 0 } }));
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id) && !n.read).length;

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
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {unreadCount} unread
          </span>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent-primary)' }}
          >
            Mark all as read
          </button>
        </div>
      )}
      <ul className="space-y-3" aria-label="Notifications">
        {notifications.map((item) => {
          const isRead = item.read || readIds.has(item.id);
          const cardClass =
            'dashboard-premium-card dashboard-hover-lift block min-h-11 w-full px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 transition-opacity' +
            (isRead ? ' opacity-60' : '');

          const handleClick = () => {
            markRead(item.id);
            if (item.type === 'interview_reminder') {
              void import('@/lib/analytics/candidate-events').then(({ trackCandidateEvent }) =>
                trackCandidateEvent('interview_resumed', { source: 'notifications' }),
              );
            }
          };

          return (
            <li key={item.id}>
              {item.resumeInterviewId ? (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  className={cardClass}
                  onClick={() => {
                    if (
                      !window.confirm(
                        'This is your one continue on this credit. Same questions. Leave again and the session ends for good.',
                      )
                    ) {
                      return;
                    }
                    markRead(item.id);
                    setBusyId(item.id);
                    void (async () => {
                      void import('@/lib/analytics/candidate-events').then(({ trackCandidateEvent }) =>
                        trackCandidateEvent('interview_resumed', { source: 'notifications' }),
                      );
                      const result = await requestInterviewResume(item.resumeInterviewId!);
                      if (!result.ok) {
                        if (result.resumeUrl) {
                          router.push(result.resumeUrl);
                          return;
                        }
                        setBusyId(null);
                        window.alert(result.message);
                        return;
                      }
                      router.push(result.resumeUrl);
                    })();
                  }}
                >
                  <NotificationBody item={item} isRead={isRead} />
                </button>
              ) : item.href ? (
                <Link href={item.href} className={cardClass} onClick={handleClick}>
                  <NotificationBody item={item} isRead={isRead} />
                </Link>
              ) : (
                <div className="dashboard-premium-card px-4 py-4" style={isRead ? { opacity: 0.6 } : undefined}>
                  <NotificationBody item={item} isRead={isRead} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
