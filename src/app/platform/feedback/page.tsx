'use client';

/**
 * /platform/feedback — Founder Feedback Triage Dashboard
 *
 * Features:
 *  - Paginated inbox with newest-first default
 *  - Full-text search (name, email, feedback content)
 *  - Filter dropdowns: severity, inbox status, half-star rating, date, label
 *  - Per-card actions: mark read, resolve, archive, pin
 *  - Expandable card: structured liked/confusion/bugs, screenshot, session context, notes
 *  - Global stats bar: total / unread / unresolved / critical+high
 *  - Mobile-responsive single-column layout
 *
 * Auth: platform layout already redirects non-admins — this component
 * trusts the layout's guard and focuses entirely on UX.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, Pin, Archive, Eye, EyeOff,
  Star, AlertCircle, X, ChevronDown, ChevronUp,
  Mail, ExternalLink, Monitor, Smartphone, Tablet,
  Wifi, MessageSquare, StickyNote,
  RotateCcw, Trash2,
} from 'lucide-react';
import type {
  FeedbackRow,
  DashboardStats,
  FeedbackListResponse,
} from '@/app/api/admin/feedback/route';
import type { RetryResultRow } from '@/app/api/admin/feedback-retry/route';
import type { FeedbackSessionContext } from '@/lib/feedback/collect-context';
import { ALL_LABELS, type FeedbackLabel } from '@/lib/feedback/auto-tag';
import {
  TECHNICAL_FAILURE_CATEGORY_LABELS,
  type TechnicalFailureStatus,
} from '@/lib/technical-failures/types';
import {
  exceededTechnicalFailureTarget,
  technicalFailureResolutionHours,
} from '@/lib/technical-failures/sla';
import {
  TECHNICAL_FAILURE_STATUS_LABELS,
  technicalCreditRestorationLabel,
} from '@/lib/technical-failures/status';
import { feedbackViewInterviewHref } from '@/lib/admin/interview-review';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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

const LABEL_COLOR: Record<FeedbackLabel, { bg: string; fg: string }> = {
  'UX':                { bg: '#ede9fe', fg: '#5b21b6' },
  'Mobile':            { bg: '#e0f2fe', fg: '#075985' },
  'Performance':       { bg: '#fef3c7', fg: '#92400e' },
  'AI Accuracy':       { bg: '#f0fdf4', fg: '#166534' },
  'Audio Issue':       { bg: '#fce7f3', fg: '#9d174d' },
  'Camera Issue':      { bg: '#fce7f3', fg: '#9d174d' },
  'Payment':           { bg: '#fee2e2', fg: '#991b1b' },
  'Login':             { bg: '#fff7ed', fg: '#9a3412' },
  'Credits Confusion': { bg: '#fefce8', fg: '#713f12' },
  'Dashboard Bug':     { bg: '#f1f5f9', fg: '#334155' },
  'Interview Crash':   { bg: '#fee2e2', fg: '#991b1b' },
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

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null || !Number.isFinite(Number(rating))) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        No rating
      </span>
    );
  }
  const value = Number(rating);
  const label = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${label} out of 5`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill =
            value >= n ? '100%' : value >= n - 0.5 ? '50%' : '0%';
          return (
            <span key={n} className="relative inline-block h-3.5 w-3.5 shrink-0">
              <Star
                className="absolute inset-0 h-3.5 w-3.5"
                style={{ fill: 'transparent', color: 'var(--card-border)' }}
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill }}>
                <Star
                  className="h-3.5 w-3.5"
                  style={{ fill: '#f59e0b', color: '#f59e0b' }}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: '#b45309' }}>
        {label}/5
      </span>
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

function LabelChip({ label }: { label: FeedbackLabel }) {
  const c = LABEL_COLOR[label] ?? { bg: '#f3f4f6', fg: '#374151' };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {label}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFeedbackReplyCompose(row: FeedbackRow) {
  const to = row.email.trim();
  if (!to || !to.includes('@')) return null;

  const subject = 'Re: Your InterviewEra feedback';
  const preview =
    row.liked_text?.trim() ||
    row.bugs_text?.trim() ||
    row.confusion_text?.trim() ||
    '';
  const firstName = row.name.trim().split(/\s+/)[0] || row.name.trim() || 'there';
  const body = [
    `Hi ${firstName},`,
    '',
    'Thanks for your feedback on InterviewEra.',
    '',
    preview ? `---\nTheir note:\n"${preview.slice(0, 800)}"` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const q = (key: string, value: string) =>
    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;

  return {
    to,
    subject,
    body,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    mailto: `mailto:${to}?${q('subject', subject)}&${q('body', body)}`,
  };
}

function FeedbackReplyButton({ row }: { row: FeedbackRow }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const compose = useMemo(() => buildFeedbackReplyCompose(row), [row]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const openUrl = useCallback((url: string) => {
    setOpen(false);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const openMailApp = useCallback(() => {
    if (!compose) return;
    setOpen(false);
    window.location.assign(compose.mailto);
  }, [compose]);

  const copyEmail = useCallback(async () => {
    if (!compose) return;
    setOpen(false);
    try {
      await navigator.clipboard.writeText(compose.to);
      toast.success('Email copied to clipboard');
    } catch {
      toast.error('Could not copy email');
    }
  }, [compose]);

  if (!compose) {
    return (
      <span
        className="ml-auto inline-flex cursor-not-allowed items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold opacity-50"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        title="No email on file"
      >
        <Mail className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reply</span>
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative ml-auto flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-l-lg border border-r-0 px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-[color:var(--card-bg)]"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
        onClick={(e) => {
          e.stopPropagation();
          openUrl(compose.gmail);
        }}
      >
        <Mail className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reply</span>
      </button>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More reply options"
        className="inline-flex items-center rounded-r-lg border px-1.5 py-1.5 transition-colors hover:bg-[color:var(--card-bg)]"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-1 min-w-[11rem] overflow-hidden rounded-xl border py-1 shadow-lg"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {[
            { label: 'Gmail', action: () => openUrl(compose.gmail) },
            { label: 'Outlook', action: () => openUrl(compose.outlook) },
            { label: 'Mail app', action: openMailApp },
            { label: 'Copy email', action: () => void copyEmail() },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
              style={{ color: 'var(--text-primary)' }}
              onClick={(e) => {
                e.stopPropagation();
                action();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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

// ─── Filter dropdown ──────────────────────────────────────────────────────────

const FILTER_SELECT_STYLE: React.CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
};

const HALF_STAR_RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] as const;

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2 text-sm font-medium outline-none"
        style={FILTER_SELECT_STYLE}
        aria-label={label}
      >
        {children}
      </select>
    </label>
  );
}

function formatRatingOption(r: number): string {
  const label = Number.isInteger(r) ? String(r) : r.toFixed(1);
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return `${'★'.repeat(full)}${half ? '½' : ''}  ${label}`;
}

function isPositiveFeedbackNote(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.startsWith('no issues') ||
    t.startsWith('nothing —') ||
    t.startsWith('nothing -') ||
    t.includes('everything worked smoothly') ||
    t.includes('everything was clear')
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
  onDelete,
  onTechnicalAction,
}: {
  row:            FeedbackRow;
  expanded:       boolean;
  mutating:       boolean;
  onToggleExpand: () => void;
  onPatch:        (patch: Partial<FeedbackRow>) => Promise<void>;
  onSaveNotes:    (notes: string) => void;
  onDelete:       () => Promise<void>;
  onTechnicalAction: (
    action: 'investigate' | 'approve' | 'reject' | 'service_recovery',
    reason?: string,
  ) => Promise<void>;
}) {
  const [notes, setNotes] = useState(row.notes ?? '');
  const [decisionDialog, setDecisionDialog] = useState<null | {
    action: 'approve' | 'reject' | 'service_recovery';
    title: string;
    description: string;
    confirmLabel: string;
  }>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
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

  function openDecisionDialog(action: 'approve' | 'reject' | 'service_recovery') {
    const config = {
      approve: {
        title: 'Approve technical failure',
        description: 'Approve this technical failure and restore exactly 1 interview credit.',
        confirmLabel: 'Approve and restore 1 interview credit',
      },
      reject: {
        title: 'Reject technical-failure restoration',
        description: 'Reject credit restoration for this technical-failure case. The user will not receive a restored credit.',
        confirmLabel: 'Reject restoration',
      },
      service_recovery: {
        title: 'Grant complimentary credit',
        description: 'Grant exactly 1 complimentary service-recovery credit. This does not change the restored interview credit.',
        confirmLabel: 'Grant 1 complimentary credit',
      },
    }[action];
    setDecisionReason('');
    setDecisionError(null);
    setDecisionDialog({ action, ...config });
  }

  async function submitDecisionDialog() {
    if (!decisionDialog) return;
    const reason = decisionReason.trim();
    if (reason.length < 3) {
      setDecisionError('Enter a concise reason (at least 3 characters).');
      return;
    }
    await onTechnicalAction(decisionDialog.action, reason);
    setDecisionDialog(null);
    setDecisionReason('');
    setDecisionError(null);
  }

  const ctx = row.session_context as unknown as FeedbackSessionContext | null;
  const hasSession = ctx && (ctx.interview_role || ctx.session_id);
  const hasDevice  = ctx && (ctx.browser_name || ctx.os || ctx.device_type);
  const technicalCase = row.technical_failure_case ?? null;
  const isTechnicalIssue = Boolean(technicalCase);
  const isInterviewFeedback = row.feedback_source === 'interview';
  const isExitFeedback = row.feedback_source === 'exit';

  // Text preview: structured liked / confusion / bugs (dropdown answers)
  const likedPreview = row.liked_text?.trim() ?? '';
  const confusionPreview = row.confusion_text?.trim() ?? '';
  const bugsPreview = row.bugs_text?.trim() ?? '';
  const hasStructuredPreview = Boolean(likedPreview || confusionPreview || bugsPreview);

  // Affected page: prefer session_context.current_page, fall back to page_url
  const affectedPage = (ctx?.current_page as string | undefined) || row.page_url || '';
  const pagePath = affectedPage ? new URL(affectedPage, 'https://x').pathname : '';
  const technicalStatus = technicalCase?.status as TechnicalFailureStatus | undefined;
  const resolutionHours = technicalCase
    ? technicalFailureResolutionHours(technicalCase.submitted_at, technicalCase.resolved_at)
    : null;
  const serviceRecoveryEligible = technicalCase
    ? exceededTechnicalFailureTarget(technicalCase.submitted_at, technicalCase.resolved_at)
    : false;
  const creditRestoration = technicalCase
    ? technicalCreditRestorationLabel({
        status: technicalCase.status as TechnicalFailureStatus,
        originalDebitPresent: Boolean(technicalCase.original_debit),
        restorationPresent: Boolean(technicalCase.restoration_transaction_id),
      })
    : null;
  const interviewRef = technicalCase?.interview
    ? [
        technicalCase.interview.role,
        technicalCase.interview.difficulty,
        technicalCase.interview.status,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div
      className="overflow-hidden rounded-2xl transition-shadow"
      style={{
        ...card,
        borderColor: row.is_pinned
          ? 'var(--accent-primary)'
          : row.severity === 'critical'
            ? '#fca5a5'
            : technicalCase
              ? '#fde68a'
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
            {/* Row 1: severity + rating + status */}
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={row.severity} />
              <RatingStars rating={row.rating} />
              {isInterviewFeedback && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#c4b5fd', background: '#f5f3ff', color: '#6d28d9' }}
                >
                  After interview feedback
                </span>
              )}
              {isExitFeedback && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#fdba74', background: '#fff7ed', color: '#c2410c' }}
                >
                  Interview exit feedback
                </span>
              )}
              {isTechnicalIssue && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#fde68a', background: '#fffbeb', color: '#b45309' }}
                >
                  Interview technical issue
                </span>
              )}
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
              {row.consent_public_display === true && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: '#c4b5fd', background: '#f5f3ff', color: '#6d28d9' }}
                  title="Submitter opted in to public display (first name only)"
                >
                  ✓ Consented
                </span>
              )}
            </div>

            {technicalCase && technicalStatus && creditRestoration && (
              <div className="flex flex-wrap gap-1.5">
                <Chip style={{ background: '#fffbeb', color: '#b45309' }}>
                  Technical failure case · {TECHNICAL_FAILURE_STATUS_LABELS[technicalStatus]}
                </Chip>
                {interviewRef ? <Chip>Interview: {interviewRef}</Chip> : null}
                <Chip
                  style={{
                    background:
                      creditRestoration === 'Restored'
                        ? '#f0fdf4'
                        : creditRestoration === 'Not eligible' || creditRestoration === 'Not restored'
                          ? '#fef2f2'
                          : '#eff6ff',
                    color:
                      creditRestoration === 'Restored'
                        ? '#15803d'
                        : creditRestoration === 'Not eligible' || creditRestoration === 'Not restored'
                          ? '#b91c1c'
                          : '#1d4ed8',
                  }}
                >
                  Credit restoration: {creditRestoration}
                </Chip>
              </div>
            )}

            {row.interview_context && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Chip style={{ background: isExitFeedback ? '#fff7ed' : '#f5f3ff', color: isExitFeedback ? '#c2410c' : '#6d28d9' }}>
                  Role: {row.interview_context.role || 'General'} ({row.interview_context.difficulty || 'medium'})
                </Chip>
                {row.interview_context.engine && (
                  <Chip>Engine: {row.interview_context.engine}</Chip>
                )}
                {row.interview_context.status && (
                  <Chip>Status: {row.interview_context.status}</Chip>
                )}
                {row.interview_context.exit_reason && (
                  <Chip style={{ background: '#fff7ed', color: '#c2410c' }}>
                    Reason: {row.interview_context.exit_reason}
                  </Chip>
                )}
                {row.interview_context.issue_type && (
                  <Chip style={{ background: '#fee2e2', color: '#991b1b' }}>
                    Issue: {row.interview_context.issue_type}
                  </Chip>
                )}
                {row.interview_context.question_index != null && (
                  <Chip>Question: {row.interview_context.question_index}</Chip>
                )}
                {row.interview_context.progress_percent != null && (
                  <Chip>Progress: {row.interview_context.progress_percent}%</Chip>
                )}
                {(() => {
                  const reviewHref = feedbackViewInterviewHref(
                    row.interview_context.interview_id,
                  );
                  if (!reviewHref) {
                    return (
                      <span
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400"
                        title="Interview id unavailable"
                      >
                        View interview unavailable
                      </span>
                    );
                  }
                  return (
                    <a
                      href={reviewHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      <span>View interview</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  );
                })()}
              </div>
            )}

            {/* Row 1b: auto-detected labels */}
            {row.labels?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(row.labels as FeedbackLabel[]).map((l) => (
                  <LabelChip key={l} label={l} />
                ))}
              </div>
            )}

            {/* Row 2: name + email */}
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {row.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
            </div>

            {/* Row 3: structured feedback preview */}
            {hasStructuredPreview && (
              <div className="space-y-1.5">
                {likedPreview ? (
                  <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Liked · </span>
                    {likedPreview}
                  </p>
                ) : null}
                {confusionPreview ? (
                  <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Confused · </span>
                    {confusionPreview}
                    {isPositiveFeedbackNote(confusionPreview) ? (
                      <span
                        className="ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: '#dcfce7', color: '#15803d' }}
                      >
                        Clear
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {bugsPreview ? (
                  <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {isTechnicalIssue ? 'Interview technical issue · ' : 'Bugs · '}
                    </span>
                    {bugsPreview}
                    {!isTechnicalIssue && isPositiveFeedbackNote(bugsPreview) ? (
                      <span
                        className="ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: '#dcfce7', color: '#15803d' }}
                      >
                        Smooth
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
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
        {!technicalCase && <ActionBtn
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          active
          activeColor="#b91c1c"
          loading={mutating}
          onClick={(e) => {
            e.stopPropagation();
            if (
              !window.confirm(
                `Permanently delete feedback from ${row.name}? This cannot be undone.`,
              )
            ) {
              return;
            }
            void onDelete();
          }}
        />}
        <FeedbackReplyButton row={row} />
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="divide-y" style={{ borderTop: '1px solid var(--card-border)', '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {/* Feedback text */}
          <div className="space-y-4 p-4 sm:p-5">
            {[
              { label: 'What did you like?', text: row.liked_text },
              { label: 'What confused you?', text: row.confusion_text },
              {
                label: isTechnicalIssue ? 'Interview technical issue' : 'Bugs or issues?',
                text: row.bugs_text,
              },
            ].map(({ label, text }) => text?.trim() ? (
              <div key={label}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </p>
                  {isPositiveFeedbackNote(text) ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: '#dcfce7', color: '#15803d' }}
                    >
                      Positive
                    </span>
                  ) : null}
                </div>
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

          {technicalCase && (
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Technical failure case
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {technicalStatus
                      ? TECHNICAL_FAILURE_STATUS_LABELS[technicalStatus]
                      : 'Unknown'}
                  </p>
                </div>
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={{
                    borderColor: technicalStatus === 'approved' ? '#86efac' : technicalStatus === 'rejected' ? '#fca5a5' : '#fde68a',
                    background: technicalStatus === 'approved' ? '#f0fdf4' : technicalStatus === 'rejected' ? '#fef2f2' : '#fffbeb',
                    color: technicalStatus === 'approved' ? '#15803d' : technicalStatus === 'rejected' ? '#b91c1c' : '#b45309',
                  }}
                >
                  {TECHNICAL_FAILURE_CATEGORY_LABELS[technicalCase.failure_category]}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Interview
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {technicalCase.interview?.role ?? 'Unknown interview'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {technicalCase.interview?.difficulty ?? '—'} · {technicalCase.interview?.status ?? '—'} · {technicalCase.interview?.engine ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Credit evidence
                  </p>
                  {technicalCase.original_debit ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Debit confirmed · {technicalCase.original_debit.reason ?? 'interview_start'}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium" style={{ color: '#b91c1c' }}>
                      Credit restoration unavailable — no verifiable interview credit debit.
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Credit restoration: {creditRestoration ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Service recovery: {technicalCase.service_recovery_transaction_id ? 'Granted' : 'Not granted'}
                  </p>
                </div>
              </div>

              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Submitted {new Date(technicalCase.submitted_at).toLocaleString('en-IN')}
                {technicalCase.review_started_at
                  ? ` · Review started ${new Date(technicalCase.review_started_at).toLocaleString('en-IN')}`
                  : ''}
                {resolutionHours !== null ? ` · Resolved in ${resolutionHours.toFixed(1)}h` : ''}
              </div>

              {technicalCase.decision_reason && (
                <p className="rounded-xl p-3 text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <span className="font-semibold">Decision: </span>{technicalCase.decision_reason}
                  {technicalCase.reviewed_by_email ? ` — ${technicalCase.reviewed_by_email}` : ''}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {technicalStatus === 'submitted' && (
                  <button
                    type="button"
                    disabled={mutating}
                    onClick={() => void onTechnicalAction('investigate')}
                    className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    Begin Review
                  </button>
                )}
                {(technicalStatus === 'submitted' || technicalStatus === 'investigating') && (
                  <>
                    <button
                      type="button"
                      disabled={mutating || !technicalCase.original_debit}
                      onClick={() => openDecisionDialog('approve')}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: '#15803d' }}
                      title={
                        technicalCase.original_debit
                          ? undefined
                          : 'Credit restoration unavailable — no verifiable interview credit debit.'
                      }
                    >
                      Approve technical failure and restore 1 interview credit
                    </button>
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() => openDecisionDialog('reject')}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: '#b91c1c' }}
                    >
                      Reject technical-failure restoration
                    </button>
                  </>
                )}
                {technicalStatus === 'approved' &&
                  serviceRecoveryEligible &&
                  !technicalCase.service_recovery_transaction_id && (
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() => openDecisionDialog('service_recovery')}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      style={{ borderColor: '#a78bfa', color: '#6d28d9' }}
                    >
                      Grant 1 complimentary credit
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* Screenshot */}
          {row.screenshot_url && (
            <div className="p-4 sm:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Screenshot
              </p>
              <a
                href={row.screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-full max-w-lg overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span className="relative block aspect-video w-full">
                  <Image
                    src={row.screenshot_url}
                    alt="User-submitted screenshot"
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 512px"
                  />
                </span>
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

      <Dialog
        open={decisionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionDialog(null);
            setDecisionReason('');
            setDecisionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decisionDialog?.title}</DialogTitle>
            <DialogDescription>{decisionDialog?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor={`tf-reason-${row.id}`} className="text-sm font-medium">
              Reason (required)
            </label>
            <Textarea
              id={`tf-reason-${row.id}`}
              value={decisionReason}
              onChange={(e) => {
                setDecisionReason(e.target.value);
                if (decisionError) setDecisionError(null);
              }}
              rows={4}
              maxLength={500}
              placeholder="Add a concise review reason for the audit trail…"
              aria-invalid={Boolean(decisionError)}
              aria-describedby={decisionError ? `tf-reason-error-${row.id}` : undefined}
            />
            {decisionError ? (
              <p id={`tf-reason-error-${row.id}`} className="text-xs font-medium text-red-600">
                {decisionError}
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Whitespace-only reasons are rejected. Users do not see this note.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDecisionDialog(null);
                setDecisionReason('');
                setDecisionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mutating}
              onClick={() => void submitDecisionDialog()}
            >
              {decisionDialog?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Retry emails button (ported from old page) ───────────────────────────────

function RetryEmailsButton({
  failedCount,
  onRetried,
}: {
  failedCount: number;
  onRetried?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ retried: number; sent: number; failed: number; rows: RetryResultRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true); setResult(null); setErr(null);
    try {
      const res  = await fetch('/api/admin/feedback-retry', { method: 'POST' });
      const data = await res.json() as typeof result & { error?: string };
      if (!res.ok) { setErr(data?.error ?? 'Something went wrong.'); }
      else          { setResult(data); onRetried?.(); }
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
  source:       string;   // '' | 'all' | 'platform' | 'interview'
  q:            string;
  severity:     string;
  rating:       string;
  is_read:      string;   // '' | 'true' | 'false'
  is_resolved:  string;
  is_pinned:    string;
  show_archived: string;
  consent_public: string; // '' | 'true'
  date_range:   string;   // '' | 'today' | 'week' | 'month'
  label:        string;   // '' | one of FeedbackLabel
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
    source:        '',
    q:             '',
    severity:      '',
    rating:        '',
    is_read:       '',
    is_resolved:   '',
    is_pinned:     '',
    show_archived: '',
    consent_public: '',
    date_range:    '',
    label:         '',
  });
  const [sort,  setSort]  = useState('newest');
  const [page,  setPage]  = useState(1);

  const [items, setItems]   = useState<FeedbackRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]   = useState<DashboardStats | null>(null);
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

  function inboxStatusValue(): string {
    if (filters.show_archived === 'true') return 'archived';
    if (filters.consent_public === 'true') return 'consented';
    if (filters.is_pinned === 'true') return 'pinned';
    if (filters.is_resolved === 'false') return 'open';
    if (filters.is_read === 'false') return 'unread';
    return '';
  }

  function setInboxStatus(value: string) {
    setFilters((f) => ({
      ...f,
      is_read: '',
      is_resolved: '',
      is_pinned: '',
      show_archived: '',
      consent_public: '',
      ...(value === 'unread' ? { is_read: 'false' } : {}),
      ...(value === 'open' ? { is_resolved: 'false' } : {}),
      ...(value === 'pinned' ? { is_pinned: 'true' } : {}),
      ...(value === 'consented' ? { consent_public: 'true' } : {}),
      ...(value === 'archived' ? { show_archived: 'true' } : {}),
    }));
    setPage(1);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
      if (filters.source)      p.set('source',        filters.source);
      if (debouncedQ)          p.set('q',             debouncedQ);
      if (filters.severity)    p.set('severity',      filters.severity);
      if (filters.rating)      p.set('rating',        filters.rating);
      if (filters.is_read)     p.set('is_read',       filters.is_read);
      if (filters.is_resolved) p.set('is_resolved',   filters.is_resolved);
      if (filters.is_pinned)   p.set('is_pinned',     filters.is_pinned);
      if (filters.show_archived) p.set('show_archived', filters.show_archived);
      if (filters.consent_public) p.set('consent_public', filters.consent_public);
      if (filters.label)         p.set('label',         filters.label);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedQ, filters.source, filters.severity, filters.rating, filters.is_read, filters.is_resolved, filters.is_pinned, filters.show_archived, filters.consent_public, filters.date_range, filters.label]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const failedEmailCount = stats?.failed_email_count ?? 0;

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

  async function technicalFailureAction(
    feedbackId: string,
    caseId: string,
    action: 'investigate' | 'approve' | 'reject' | 'service_recovery',
    reason?: string,
  ) {
    setMutating((current) => ({ ...current, [feedbackId]: true }));
    try {
      const res = await fetch(`/api/admin/technical-failures/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || 'Technical failure action failed.');
        return;
      }
      toast.success(
        action === 'approve'
          ? 'Approved. One interview credit was restored.'
          : action === 'reject'
            ? 'Technical failure case rejected.'
            : action === 'service_recovery'
              ? 'One service-recovery credit was granted.'
              : 'Investigation started.',
      );
      await fetchData();
    } catch {
      toast.error('Technical failure action failed.');
    } finally {
      setMutating((current) => ({ ...current, [feedbackId]: false }));
    }
  }

  async function deleteItem(id: string) {
    setMutating((m) => ({ ...m, [id]: true }));
    const previous = items;
    setItems((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setItems(previous);
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error || 'Failed to delete feedback.');
        return;
      }
      toast.success('Feedback deleted.');
      void fetchData();
    } catch {
      setItems(previous);
      toast.error('Failed to delete feedback.');
    } finally {
      setMutating((m) => ({ ...m, [id]: false }));
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
    setFilters({ source: '', q: '', severity: '', rating: '', is_read: '', is_resolved: '', is_pinned: '', show_archived: '', consent_public: '', date_range: '', label: '' });
    setDebouncedQ('');
    setSort('newest');
    setPage(1);
  }

  const hasActiveFilters = !!(
    filters.source || filters.severity || filters.rating || filters.is_read || filters.is_resolved ||
    filters.is_pinned || filters.show_archived || filters.consent_public || filters.date_range || filters.label || debouncedQ
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
          <RetryEmailsButton failedCount={failedEmailCount} onRetried={() => void fetchData()} />
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

      {/* ── Filters (dropdown system — mirrors submit form upgrades) ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <FilterSelect
          label="Source"
          value={filters.source || 'all'}
          onChange={(v) => setFilter('source', v === 'all' ? '' : v)}
        >
          <option value="all">All sources</option>
          <option value="platform">Platform General</option>
          <option value="interview">After Interview</option>
          <option value="exit">Interview Exit</option>
        </FilterSelect>

        <FilterSelect
          label="Severity"
          value={filters.severity}
          onChange={(v) => setFilter('severity', v)}
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </FilterSelect>

        <FilterSelect
          label="Inbox"
          value={inboxStatusValue()}
          onChange={setInboxStatus}
        >
          <option value="">All items</option>
          <option value="unread">Unread</option>
          <option value="open">Open</option>
          <option value="pinned">Pinned</option>
          <option value="consented">Consented</option>
          <option value="archived">Archived</option>
        </FilterSelect>

        <FilterSelect
          label="Rating"
          value={filters.rating}
          onChange={(v) => setFilter('rating', v)}
        >
          <option value="">All ratings</option>
          {HALF_STAR_RATINGS.map((r) => (
            <option key={r} value={String(r)}>
              {formatRatingOption(r)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Date"
          value={filters.date_range}
          onChange={(v) => setFilter('date_range', v)}
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </FilterSelect>

        <FilterSelect
          label="Label"
          value={filters.label}
          onChange={(v) => setFilter('label', v)}
        >
          <option value="">All labels</option>
          {ALL_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </FilterSelect>

        <div className="flex flex-col justify-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--accent-danger) 10%, var(--card-bg))',
                color: 'var(--accent-danger)',
                borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, var(--card-border))',
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          ) : (
            <span className="rounded-xl border px-3 py-2 text-center text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              No filters
            </span>
          )}
        </div>
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
              onDelete={() => deleteItem(row.id)}
              onTechnicalAction={(action, reason) =>
                technicalFailureAction(
                  row.id,
                  row.technical_failure_case!.id,
                  action,
                  reason,
                )
              }
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
