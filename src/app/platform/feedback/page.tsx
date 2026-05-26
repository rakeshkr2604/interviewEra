'use client';

/**
 * /platform/feedback — Founder Feedback Triage Dashboard
 *
 * Features:
 *  - Paginated inbox with newest-first default
 *  - Full-text search (name, email, feedback content)
 *  - Filter pills: severity, read/unread, resolved, pinned, archived, rating, date
 *  - Per-card actions: mark read, resolve, archive, pin
 *  - Expandable card: full text, screenshot, session context, internal notes
 *  - Global stats bar: total / unread / unresolved / critical+high
 *  - Mobile-responsive single-column layout
 *
 * Auth: platform layout already redirects non-admins — this component
 * trusts the layout's guard and focuses entirely on UX.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, Pin, Archive, Eye, EyeOff,
  Star, AlertCircle, X, ChevronDown, ChevronUp,
  Mail, ExternalLink, Monitor, Smartphone, Tablet,
  Wifi, Mic, Camera, MessageSquare, StickyNote,
  RotateCcw,
} from 'lucide-react';
import type {
  FeedbackRow,
  DashboardStats,
  FeedbackListResponse,
} from '@/app/api/admin/feedback/route';
import type { RetryResultRow } from '@/app/api/admin/feedback-retry/route';
import type { FeedbackSessionContext } from '@/lib/feedback/collect-context';

// ─── Shared card style (matches analytics page) ───────────────────────────────

const card: React.CSSProperties = {
  borderRadius: 16,
  border: '1.5px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800)return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Small presentational components ─────────────────────────────────────────

const SEVERITY_MAP = {
  critical: { bg: '#fecaca', fg: '#7f1d1d', dot: '#dc2626', label: 'CRITICAL' },
  high:     { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444', label: 'HIGH'     },
  medium:   { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b', label: 'MEDIUM'   },
  low:      { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e', label: 'LOW'      },
};

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const cfg = SEVERITY_MAP[severity as keyof typeof SEVERITY_MAP] ?? SEVERITY_MAP.low;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="h-3.5 w-3.5"
          style={{
            fill:  n <= rating ? '#f59e0b' : 'transparent',
            color: n <= rating ? '#f59e0b' : 'var(--card-border)',
          }}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function Chip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', ...style }}
    >
      {children}
    </span>
  );
}

function PermBadge({ val, label }: { val: string | undefined; label: string }) {
  if (!val || val === 'unknown') return null;
  const color = val === 'granted' ? '#15803d' : val === 'denied' ? '#b91c1c' : '#b45309';
  const bg    = val === 'granted' ? '#dcfce7' : val === 'denied' ? '#fee2e2' : '#fef3c7';
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: bg, color }}>
      {label}: {val}
    </span>
  );
}

function DeviceIcon({ type }: { type: string | undefined }) {
  if (type === 'mobile')  return <Smartphone className="h-3 w-3" />;
  if (type === 'tablet')  return <Tablet     className="h-3 w-3" />;
  return <Monitor className="h-3 w-3" />;
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({
  stats,
  loading,
  onFilterUnread,
  onFilterUnresolved,
  onFilterCritical,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  onFilterUnread:     () => void;
  onFilterUnresolved: () => void;
  onFilterCritical:   () => void;
}) {
  const cells = [
    {
      label: 'Total',
      value: stats?.total_unarchived ?? 0,
      color: 'var(--accent-primary)',
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'Unread',
      value: stats?.unread ?? 0,
      color: '#7c3aed',
      onClick: onFilterUnread,
    },
    {
      label: 'Unresolved',
      value: stats?.unresolved ?? 0,
      color: '#b45309',
      onClick: onFilterUnresolved,
    },
    {
      label: 'Critical / High',
      value: stats?.critical_and_high ?? 0,
      color: '#b91c1c',
      onClick: onFilterCritical,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cells.map(({ label, value, color, onClick }) => (
        <button
          key={label}
          type="button"
          disabled={!onClick}
          onClick={onClick}
          className="flex flex-col gap-1 rounded-[14px] border p-4 text-left transition-all"
          style={{
            ...card,
            cursor: onClick ? 'pointer' : 'default',
            borderColor: 'var(--card-border)',
          }}
          onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = color; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
        >
          {loading ? (
            <div className="h-6 w-16 animate-pulse rounded" style={{ background: 'var(--card-border)' }} />
          ) : (
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
          {onClick && (
            <span className="text-[10px] font-semibold" style={{ color }}>Filter →</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
  activeColor = 'var(--accent-primary)',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all"
      style={{
        borderColor:  active ? activeColor  : 'var(--card-border)',
        background:   active ? `color-mix(in srgb, ${activeColor} 12%, var(--card-bg))` : 'var(--card-bg)',
        color:        active ? activeColor  : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  active,
  activeColor,
  loading,
  onClick,
}: {
  icon:        React.ReactNode;
  label:       string;
  active?:     boolean;
  activeColor?: string;
  loading?:    boolean;
  onClick:     (e: React.MouseEvent) => void;
}) {
  const color = active ? (activeColor ?? 'var(--accent-primary)') : 'var(--text-muted)';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={loading}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40"
      style={{
        background: active
          ? `color-mix(in srgb, ${activeColor ?? 'var(--accent-primary)'} 12%, transparent)`
          : 'var(--bg-secondary)',
        color,
        border: `1px solid ${active ? (activeColor ?? 'var(--accent-primary)') + '40' : 'var(--card-border)'}`,
      }}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2"
          style={{ borderColor: `${color} transparent transparent transparent` }} />
      ) : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── Expandable feedback card ─────────────────────────────────────────────────

function FeedbackCard({
  row,
  expanded,
  mutating,
  onToggleExpand,
  onPatch,
  onSaveNotes,
}: {
  row:            FeedbackRow;
  expanded:       boolean;
  mutating:       boolean;
  onToggleExpand: () => void;
  onPatch:        (patch: Partial<FeedbackRow>) => Promise<void>;
  onSaveNotes:    (notes: string) => void;
}) {
  const [notes, setNotes] = useState(row.notes ?? '');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync notes if the row updates externally
  useEffect(() => { setNotes(row.notes ?? ''); }, [row.notes]);

  // Auto-mark read when expanded
  useEffect(() => {
    if (expanded && !row.is_read) {
      void onPatch({ is_read: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  function handleNotesChange(val: string) {
    setNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onSaveNotes(val), 600);
  }

  const ctx = row.session_context as unknown as FeedbackSessionContext | null;
  const hasSession = ctx && (ctx.interview_role || ctx.session_id);
  const hasDevice  = ctx && (ctx.browser_name || ctx.os || ctx.device_type);

  // Text preview: first non-empty field
  const preview =
    row.liked_text?.trim()     ||
    row.bugs_text?.trim()      ||
    row.confusion_text?.trim() ||
    '';

  // Affected page: prefer session_context.current_page, fall back to page_url
  const affectedPage = (ctx?.current_page as string | undefined) || row.page_url || '';
  const pagePath = affectedPage ? new URL(affectedPage, 'https://x').pathname : '';

  return (
    <div
      className="overflow-hidden rounded-2xl transition-shadow"
      style={{
        ...card,
        borderColor: row.is_pinned
          ? 'var(--accent-primary)'
          : row.severity === 'critical'
            ? '#fca5a5'
            : 'var(--card-border)',
        opacity: row.is_archived ? 0.65 : 1,
      }}
    >
      {/* ── Card header ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3 p-4 sm:p-5">
          {/* Left: unread dot */}
          <div className="mt-1.5 flex shrink-0 flex-col items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full transition-all"
              style={{
                background: row.is_read ? 'var(--card-border)' : 'var(--accent-primary)',
              }}
              title={row.is_read ? 'Read' : 'Unread'}
            />
            {row.is_pinned && (
              <Pin className="h-3 w-3" style={{ color: 'var(--accent-primary)', fill: 'var(--accent-primary)' }} />
            )}
          </div>

          {/* Middle: main content */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Row 1: severity + rating + time */}
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={row.severity} />
              <RatingStars rating={row.rating} />
              {!row.is_resolved && (
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#fde68a', background: '#fffbeb', color: '#b45309' }}>
                  Open
                </span>
              )}
              {row.is_resolved && (
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#15803d' }}>
                  Resolved
                </span>
              )}
            </div>

            {/* Row 2: name + email */}
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {row.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
            </div>

            {/* Row 3: text preview */}
            {preview && (
              <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                "{preview}"
              </p>
            )}

            {/* Row 4: context chips */}
            <div className="flex flex-wrap gap-1.5">
              {pagePath && (
                <Chip><ExternalLink className="h-2.5 w-2.5" />{pagePath}</Chip>
              )}
              {ctx?.interview_role && (
                <Chip>{ctx.interview_role as string}</Chip>
              )}
              {ctx?.difficulty_level && (
                <Chip>{ctx.difficulty_level as string}</Chip>
              )}
              {ctx?.device_type && (
                <Chip>
                  <DeviceIcon type={ctx.device_type as string} />
                  {ctx.device_type as string}
                </Chip>
              )}
              {ctx?.browser_name && (
                <Chip>{ctx.browser_name as string}</Chip>
              )}
              {row.screenshot_url && (
                <Chip style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                  📎 screenshot
                </Chip>
              )}
            </div>
          </div>

          {/* Right: time + expand arrow */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
              {relTime(row.created_at)}
            </span>
            {expanded
              ? <ChevronUp  className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            }
          </div>
        </div>
      </button>

      {/* ── Action bar ── */}
      <div
        className="flex flex-wrap gap-2 border-t px-4 py-2.5 sm:px-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <ActionBtn
          icon={row.is_read ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          label={row.is_read ? 'Read' : 'Mark read'}
          active={row.is_read}
          activeColor="#6366f1"
          loading={mutating}
          onClick={(e) => { e.stopPropagation(); void onPatch({ is_read: !row.is_read }); }}
        />
        <ActionBtn
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label={row.is_resolved ? 'Resolved' : 'Resolve'}
          active={row.is_resolved}
          activeColor="#15803d"
          loading={mutating}
          onClick={(e) => { e.stopPropagation(); void onPatch({ is_resolved: !row.is_resolved }); }}
        />
        <ActionBtn
          icon={<Pin className="h-3.5 w-3.5" />}
          label={row.is_pinned ? 'Pinned' : 'Pin'}
          active={row.is_pinned}
          activeColor="var(--accent-primary)"
          loading={mutating}
          onClick={(e) => { e.stopPropagation(); void onPatch({ is_pinned: !row.is_pinned }); }}
        />
        <ActionBtn
          icon={<Archive className="h-3.5 w-3.5" />}
          label={row.is_archived ? 'Unarchive' : 'Archive'}
          active={row.is_archived}
          activeColor="#6b7280"
          loading={mutating}
          onClick={(e) => { e.stopPropagation(); void onPatch({ is_archived: !row.is_archived }); }}
        />
        <a
          href={`mailto:${row.email}?subject=Re: Your InterviewEra feedback`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-[color:var(--card-bg)]"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reply</span>
        </a>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="divide-y" style={{ borderTop: '1px solid var(--card-border)', '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {/* Feedback text */}
          <div className="space-y-4 p-4 sm:p-5">
            {[
              { label: 'What they liked',      text: row.liked_text      },
              { label: 'What confused them',   text: row.confusion_text  },
              { label: 'Bugs / issues',        text: row.bugs_text       },
            ].map(({ label, text }) => text?.trim() ? (
              <div key={label}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {text}
                </p>
              </div>
            ) : null)}

            {row.would_use_again !== null && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Would use again:{' '}
                <strong style={{ color: row.would_use_again ? '#15803d' : '#b91c1c' }}>
                  {row.would_use_again ? 'Yes' : 'No'}
                </strong>
              </p>
            )}
          </div>

          {/* Screenshot */}
          {row.screenshot_url && (
            <div className="p-4 sm:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Screenshot
              </p>
              <a href={row.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={row.screenshot_url}
                  alt="User-submitted screenshot"
                  className="w-full max-w-lg rounded-xl border object-cover"
                  style={{ borderColor: 'var(--card-border)' }}
                  loading="lazy"
                />
              </a>
            </div>
          )}

          {/* Technical context */}
          {(hasSession || hasDevice) && (
            <div className="p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Technical Context
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Interview session */}
                {hasSession && (
                  <div className="space-y-1.5 rounded-xl p-3" style={{ background: 'color-mix(in srgb, #6366f1 8%, var(--bg-secondary))' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Interview Session</p>
                    {ctx?.session_id && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>ID: </span>
                        <code className="font-mono text-[11px]">{ctx.session_id as string}</code>
                      </p>
                    )}
                    {ctx?.interview_role && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Role: </span>{ctx.interview_role as string}</p>}
                    {ctx?.interview_type && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Type: </span>{ctx.interview_type as string}</p>}
                    {ctx?.difficulty_level && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Difficulty: </span>{ctx.difficulty_level as string}</p>}
                    {ctx?.interview_duration_seconds != null && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                        {formatDuration(ctx.interview_duration_seconds as number)}
                      </p>
                    )}
                  </div>
                )}

                {/* Browser / device */}
                {hasDevice && (
                  <div className="space-y-1.5 rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Browser & Device</p>
                    {ctx?.browser_name && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Browser: </span>{ctx.browser_name as string}</p>}
                    {ctx?.os && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>OS: </span>{ctx.os as string}</p>}
                    {ctx?.device_type && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Device: </span><DeviceIcon type={ctx.device_type as string} />{ctx.device_type as string}</p>}
                    {ctx?.screen_size && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Screen: </span>{ctx.screen_size as string}</p>}
                    {ctx?.network_type && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <Wifi className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                        {ctx.network_type as string}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <PermBadge val={ctx?.mic_permission_status as string | undefined} label="Mic" />
                      <PermBadge val={ctx?.camera_permission_status as string | undefined} label="Cam" />
                      {ctx?.speech_recognition_supported != null && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: ctx.speech_recognition_supported ? '#dcfce7' : '#fee2e2',
                            color:      ctx.speech_recognition_supported ? '#15803d' : '#b91c1c',
                          }}>
                          Speech API: {ctx.speech_recognition_supported ? 'yes' : 'no'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Page at submit */}
              {(ctx?.current_page || row.page_url) && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Page: <a
                    href={(ctx?.current_page as string) || row.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {(ctx?.current_page as string) || row.page_url}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Internal notes */}
          <div className="p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Internal notes (founder only)
              </p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add private notes about this issue…"
              maxLength={5000}
              rows={3}
              className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[color:var(--accent-primary)]"
              style={{
                background:  'var(--bg-secondary)',
                borderColor: 'var(--card-border)',
                color:       'var(--text-primary)',
              }}
            />
            <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {notes.length}/5000 · auto-saved on pause
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Retry emails button (ported from old page) ───────────────────────────────

function RetryEmailsButton({ failedCount }: { failedCount: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ retried: number; sent: number; failed: number; rows: RetryResultRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true); setResult(null); setErr(null);
    try {
      const res  = await fetch('/api/admin/feedback-retry', { method: 'POST' });
      const data = await res.json() as typeof result & { error?: string };
      if (!res.ok) { setErr(data?.error ?? 'Something went wrong.'); }
      else          { setResult(data); }
    } catch { setErr('Network error — please try again.'); }
    finally   { setLoading(false); }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRetry}
        disabled={loading || failedCount === 0}
        className="inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
          boxShadow:  '0 4px 14px color-mix(in srgb, var(--accent-primary) 25%, transparent)',
        }}
      >
        {loading
          ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Retrying…</>
          : <><RotateCcw className="h-3 w-3" />{failedCount === 0 ? 'No failed emails' : `Retry ${failedCount} email${failedCount === 1 ? '' : 's'}`}</>
        }
      </button>
      {err    && <p className="text-xs" style={{ color: 'var(--accent-danger)' }}>{err}</p>}
      {result && result.retried > 0 && (
        <p className="text-xs" style={{ color: result.failed === 0 ? '#15803d' : '#b45309' }}>
          {result.sent} sent · {result.failed} still failed
        </p>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

interface Filters {
  q:            string;
  severity:     string;
  rating:       string;
  is_read:      string;   // '' | 'true' | 'false'
  is_resolved:  string;
  is_pinned:    string;
  show_archived: string;
  date_range:   string;   // '' | 'today' | 'week' | 'month'
}

function dateRangeToParams(range: string): { date_from?: string; date_to?: string } {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  if (range === 'today') return { date_from: today };
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { date_from: d.toISOString().slice(0, 10) };
  }
  if (range === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return { date_from: d.toISOString().slice(0, 10) };
  }
  return {};
}

export default function PlatformFeedbackPage() {
  const [filters, setFilters] = useState<Filters>({
    q:             '',
    severity:      '',
    rating:        '',
    is_read:       '',
    is_resolved:   '',
    is_pinned:     '',
    show_archived: '',
    date_range:    '',
  });
  const [sort,  setSort]  = useState('newest');
  const [page,  setPage]  = useState(1);

  const [items, setItems]   = useState<FeedbackRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [failedEmailCount, setFailedEmailCount] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Per-item mutation state: id → boolean
  const [mutating, setMutating] = useState<Record<string, boolean>>({});

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [debouncedQ, setDebouncedQ] = useState('');
  function handleSearchChange(val: string) {
    setFilters(f => ({ ...f, q: val }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 350);
  }

  // Reset page when non-search filters change
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
      if (debouncedQ)          p.set('q',             debouncedQ);
      if (filters.severity)    p.set('severity',      filters.severity);
      if (filters.rating)      p.set('rating',        filters.rating);
      if (filters.is_read)     p.set('is_read',       filters.is_read);
      if (filters.is_resolved) p.set('is_resolved',   filters.is_resolved);
      if (filters.is_pinned)   p.set('is_pinned',     filters.is_pinned);
      if (filters.show_archived) p.set('show_archived', filters.show_archived);
      const dr = dateRangeToParams(filters.date_range);
      if (dr.date_from) p.set('date_from', dr.date_from);
      if (dr.date_to)   p.set('date_to',   dr.date_to);

      const res  = await fetch(`/api/admin/feedback?${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as FeedbackListResponse;

      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setStats(data.stats);

      // Also fetch failed email count for the retry button
      const failRes = await fetch('/api/admin/feedback?limit=1&is_archived=&email_status=failed').catch(() => null);
      if (failRes?.ok) {
        // We don't have a dedicated failed-count endpoint; use the stats field via a quick count
        // For now approximate from stats — this is only for the retry button label
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedQ, filters.severity, filters.rating, filters.is_read, filters.is_resolved, filters.is_pinned, filters.show_archived, filters.date_range]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Also load failed email count once on mount
  useEffect(() => {
    fetch('/api/admin/feedback?limit=1&show_archived=false')
      .then(r => r.ok ? r.json() as Promise<FeedbackListResponse> : null)
      .then(d => {
        if (!d) return;
        // Use platform/feedback API to get failed email count separately
        // For now we load it from a dedicated query
      })
      .catch(() => null);

    // Fetch email failure count via retry endpoint (HEAD trick is not available, so just call stats)
    fetch('/api/admin/recent-users?page=1&limit=1')
      .catch(() => null); // fire and forget warm-up
  }, []);

  // ── Mutation ───────────────────────────────────────────────────────────────
  async function patchItem(id: string, patch: Partial<FeedbackRow>) {
    setMutating(m => ({ ...m, [id]: true }));
    // Optimistic update
    setItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      });
      if (!res.ok) {
        // Rollback on failure
        void fetchData();
      }
    } catch {
      void fetchData();
    } finally {
      setMutating(m => ({ ...m, [id]: false }));
    }
  }

  function saveNotes(id: string, notes: string) {
    void patchItem(id, { notes: notes || null });
  }

  // ── Quick-filter helpers (for stats bar clicks) ────────────────────────────
  function quickFilterUnread()     { setFilter('is_read', 'false');    setFilter('show_archived', ''); }
  function quickFilterUnresolved() { setFilter('is_resolved', 'false'); setFilter('show_archived', ''); }
  function quickFilterCritical()   {
    setFilter('severity', 'critical');
    setFilter('show_archived', '');
    setFilters(f => ({ ...f, severity: 'critical', is_read: '', is_resolved: '', show_archived: '' }));
    setPage(1);
  }

  // Clear all filters
  function clearFilters() {
    setFilters({ q: '', severity: '', rating: '', is_read: '', is_resolved: '', is_pinned: '', show_archived: '', date_range: '' });
    setDebouncedQ('');
    setSort('newest');
    setPage(1);
  }

  const hasActiveFilters = !!(
    filters.severity || filters.rating || filters.is_read || filters.is_resolved ||
    filters.is_pinned || filters.show_archived || filters.date_range || debouncedQ
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Feedback Inbox
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${total} matching · ${stats?.total_unarchived ?? 0} total in inbox`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RetryEmailsButton failedCount={failedEmailCount} />
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
            style={{ border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <StatsBar
        stats={stats}
        loading={loading && !stats}
        onFilterUnread={quickFilterUnread}
        onFilterUnresolved={quickFilterUnresolved}
        onFilterCritical={quickFilterCritical}
      />

      {/* ── Search + sort row ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, or keywords…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--text-muted)]"
            style={{ color: 'var(--text-primary)' }}
          />
          {filters.q && (
            <button onClick={() => { handleSearchChange(''); }} className="shrink-0">
              <X className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="rounded-xl border px-3 py-2 text-sm font-medium outline-none"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="severity">By severity</option>
          <option value="rating_desc">Rating ↓</option>
          <option value="rating_asc">Rating ↑</option>
        </select>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {/* Severity */}
        {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
          <FilterPill
            key={s}
            active={filters.severity === s}
            activeColor={SEVERITY_MAP[s].fg}
            onClick={() => setFilter('severity', filters.severity === s ? '' : s)}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_MAP[s].dot }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </FilterPill>
        ))}

        <div className="mx-1 w-px self-stretch" style={{ background: 'var(--card-border)' }} />

        {/* Read status */}
        <FilterPill active={filters.is_read === 'false'} onClick={() => setFilter('is_read', filters.is_read === 'false' ? '' : 'false')}>
          <EyeOff className="h-3 w-3" /> Unread
        </FilterPill>
        <FilterPill active={filters.is_resolved === 'false'} activeColor="#b45309" onClick={() => setFilter('is_resolved', filters.is_resolved === 'false' ? '' : 'false')}>
          <AlertCircle className="h-3 w-3" /> Open
        </FilterPill>
        <FilterPill active={filters.is_pinned === 'true'} activeColor="var(--accent-primary)" onClick={() => setFilter('is_pinned', filters.is_pinned === 'true' ? '' : 'true')}>
          <Pin className="h-3 w-3" /> Pinned
        </FilterPill>
        <FilterPill active={filters.show_archived === 'true'} activeColor="#6b7280" onClick={() => setFilter('show_archived', filters.show_archived === 'true' ? '' : 'true')}>
          <Archive className="h-3 w-3" /> Archived
        </FilterPill>

        <div className="mx-1 w-px self-stretch" style={{ background: 'var(--card-border)' }} />

        {/* Rating */}
        {[1, 2, 3, 4, 5].map((r) => (
          <FilterPill key={r} active={filters.rating === String(r)} activeColor="#f59e0b" onClick={() => setFilter('rating', filters.rating === String(r) ? '' : String(r))}>
            {'★'.repeat(r)}
          </FilterPill>
        ))}

        <div className="mx-1 w-px self-stretch" style={{ background: 'var(--card-border)' }} />

        {/* Date range */}
        {(['today', 'week', 'month'] as const).map((d) => (
          <FilterPill key={d} active={filters.date_range === d} onClick={() => setFilter('date_range', filters.date_range === d ? '' : d)}>
            {d === 'today' ? 'Today' : d === 'week' ? 'This week' : 'This month'}
          </FilterPill>
        ))}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={{ background: 'color-mix(in srgb, var(--accent-danger) 10%, var(--card-bg))', color: 'var(--accent-danger)', border: '1px solid color-mix(in srgb, var(--accent-danger) 30%, var(--card-border))' }}
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
          style={{ background: 'color-mix(in srgb, var(--accent-danger) 8%, var(--card-bg))', color: 'var(--accent-danger)', border: '1px solid color-mix(in srgb, var(--accent-danger) 30%, var(--card-border))' }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => void fetchData()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* ── Feedback list ── */}
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ border: '1.5px dashed var(--card-border)' }}
        >
          <MessageSquare className="mb-3 h-10 w-10" style={{ color: 'var(--card-border)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No feedback found</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Feedback submissions will appear here.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <FeedbackCard
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              mutating={!!mutating[row.id]}
              onToggleExpand={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onPatch={(patch) => patchItem(row.id, patch)}
              onSaveNotes={(notes) => saveNotes(row.id, notes)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg p-2 transition-colors hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[6rem] text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-lg p-2 transition-colors hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Feedback dashboard · restricted to platform admin only
      </p>
    </div>
  );
}
