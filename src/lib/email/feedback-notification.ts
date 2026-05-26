import { Resend } from 'resend';
import type { FeedbackSessionContext } from '@/lib/feedback/collect-context';

const FROM_EMAIL = 'InterviewEra <transactional@interviewera.com>';

function founderEmail(): string {
  return process.env.FOUNDER_FEEDBACK_EMAIL?.trim() || 'Rakesh.kr2604@gmail.com';
}

export interface FeedbackPayload {
  name: string;
  email: string;
  userId: string | null;
  rating: number;
  likedText: string;
  confusionText: string;
  bugsText: string;
  wouldUseAgain: boolean | null;
  pageUrl: string;
  browserInfo: string;
  /** Long-lived signed URL to the attached screenshot, or null if none. */
  screenshotUrl: string | null;
  /** Full technical context collected client-side. Null for older submissions. */
  sessionContext: FeedbackSessionContext | null;
  createdAt: Date;
}

// ─── Severity scoring ─────────────────────────────────────────────────────────

export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Critical issue groups, ordered by triage importance. A match in any group
 * escalates severity to `critical` and provides a descriptive subject label.
 * Keywords are matched case-insensitively as substrings across all free-text.
 */
const CRITICAL_GROUPS: { label: string; keywords: string[] }[] = [
  { label: 'Payment Issue', keywords: ['payment', 'charged', 'double charge', 'refund', 'billing', 'card declined', 'paid but'] },
  { label: 'Login Failure', keywords: ['login', 'log in', 'sign in', 'signin', 'sign-in', 'log-in', "can't log", 'cant log', 'cannot log'] },
  { label: "Can't Start Interview", keywords: ["can't start", 'cant start', 'cannot start', 'can not start', "won't start", 'wont start', 'unable to start', 'interview not starting', "won't begin"] },
  { label: 'Crash / Frozen', keywords: ['crash', 'crashed', 'crashing', 'frozen', 'freeze', 'froze', 'stuck', 'hangs', 'hung', 'unresponsive'] },
  { label: 'Data Loss', keywords: ['data loss', 'lost my data', 'lost all', 'lost my progress', 'disappeared'] },
];

/** Generic bug indicators (don't escalate to critical, but mark a real defect). */
const BUG_KEYWORDS = [
  'bug', 'error', 'broken', 'glitch', 'not working', "doesn't work", 'does not work',
  "won't work", 'wont work', 'failed', 'fails', 'failure', 'blank screen', '404', '500',
];

function haystack(p: FeedbackPayload): string {
  return `${p.likedText}\n${p.confusionText}\n${p.bugsText}`.toLowerCase();
}

function matchesAny(hay: string, keywords: string[]): boolean {
  return keywords.some((k) => hay.includes(k));
}

/**
 * Auto-classifies a submission into a severity level + a short subject label.
 * Pure + deterministic so the API route (DB persistence) and the email builder
 * derive the same value independently.
 *
 * Precedence:
 *   1. critical keyword anywhere        → critical
 *   2. rating ≤ 2 AND a bug is reported → high
 *   3. a bug is reported (rating ≥ 3)   → medium
 *   4. confusion reported               → medium
 *   5. rating ≤ 2 (no specifics)        → medium
 *   6. rating ≥ 4                        → low (positive)
 *   7. otherwise                         → low
 */
export function assessFeedback(p: FeedbackPayload): {
  label: string;
  severity: FeedbackSeverity;
} {
  const hay = haystack(p);

  for (const group of CRITICAL_GROUPS) {
    if (matchesAny(hay, group.keywords)) {
      return { label: group.label, severity: 'critical' };
    }
  }

  const hasBug = p.bugsText.trim().length > 0 || matchesAny(hay, BUG_KEYWORDS);
  if (hasBug) {
    return { label: 'Bug Report', severity: p.rating <= 2 ? 'high' : 'medium' };
  }
  if (p.confusionText.trim()) {
    return { label: 'Confusing UX', severity: 'medium' };
  }
  if (p.rating <= 2) {
    return { label: 'Negative Feedback', severity: 'medium' };
  }
  if (p.rating >= 4) {
    return { label: 'Positive Feedback', severity: 'low' };
  }
  return { label: 'General Feedback', severity: 'low' };
}

export function buildSubject(p: FeedbackPayload): string {
  const { label, severity } = assessFeedback(p);
  return `[${severity.toUpperCase()}][InterviewEra Feedback] Rating: ${p.rating}/5 — ${label}`;
}

/** Submission timestamp rendered in IST (Asia/Kolkata). */
function formatIST(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date) + ' IST';
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Preserve user line breaks inside an already-escaped string. */
function nl2br(escaped: string): string {
  return escaped.replace(/\r?\n/g, '<br>');
}

const SEVERITY_COLORS: Record<FeedbackSeverity, { bg: string; fg: string }> = {
  critical: { bg: '#fecaca', fg: '#7f1d1d' },
  high: { bg: '#fee2e2', fg: '#b91c1c' },
  medium: { bg: '#fef3c7', fg: '#b45309' },
  low: { bg: '#dcfce7', fg: '#15803d' },
};

function ratingStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function section(title: string, body: string): string {
  return `
    <tr><td style="padding:18px 0 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(title)}</p>
      <div style="font-size:14px;line-height:1.55;color:#111827;background:#f9fafb;border:1px solid #eef0f3;border-radius:8px;padding:12px 14px;">${body}</div>
    </td></tr>`;
}

function emptyValue(): string {
  return '<span style="color:#9ca3af;font-style:italic;">— not provided —</span>';
}

/** Inline preview + clickable link for an attached screenshot. */
function screenshotSection(url: string): string {
  const safeUrl = escapeHtml(url);
  return `
    <tr><td style="padding:18px 0 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Screenshot</p>
      <a href="${safeUrl}" target="_blank" style="display:block;border:1px solid #eef0f3;border-radius:8px;overflow:hidden;text-decoration:none;">
        <img src="${safeUrl}" alt="Feedback screenshot attached by the user" style="display:block;width:100%;max-width:100%;height:auto;background:#f9fafb;" />
      </a>
      <p style="margin:8px 0 0;font-size:12px;"><a href="${safeUrl}" target="_blank" style="color:#4f46e5;font-weight:600;">Open full-size screenshot →</a></p>
    </td></tr>`;
}

// ─── Technical context section ────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function boolBadge(val: boolean | null | undefined): string {
  if (val == null) return emptyValue();
  return val
    ? '<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#dcfce7;color:#15803d;">Yes</span>'
    : '<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fee2e2;color:#b91c1c;">No</span>';
}

function permBadge(val: string | null | undefined): string {
  if (!val || val === 'unknown') return emptyValue();
  const colors: Record<string, { bg: string; fg: string }> = {
    granted: { bg: '#dcfce7', fg: '#15803d' },
    denied:  { bg: '#fee2e2', fg: '#b91c1c' },
    prompt:  { bg: '#fef3c7', fg: '#b45309' },
  };
  const c = colors[val] ?? { bg: '#f3f4f6', fg: '#6b7280' };
  return `<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${c.bg};color:${c.fg};">${escapeHtml(val)}</span>`;
}

function ctxRow(k: string, v: string): string {
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;font-size:12px;color:#6b7280;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td>
      <td style="padding:4px 0;font-size:12px;color:#111827;word-break:break-word;">${v}</td>
    </tr>`;
}

function buildContextSection(ctx: FeedbackPayload['sessionContext']): string {
  if (!ctx) return '';

  const sessionRows = [
    ctx.session_id       ? ctxRow('Session ID',     escapeHtml(ctx.session_id))              : '',
    ctx.interview_role   ? ctxRow('Role',            escapeHtml(ctx.interview_role))          : '',
    ctx.interview_type   ? ctxRow('Interview type',  escapeHtml(ctx.interview_type))          : '',
    ctx.difficulty_level ? ctxRow('Difficulty',      escapeHtml(ctx.difficulty_level))        : '',
    ctxRow('Duration',    escapeHtml(formatDuration(ctx.interview_duration_seconds))),
  ].filter(Boolean).join('');

  const deviceRows = [
    ctx.browser_name   ? ctxRow('Browser',       escapeHtml(ctx.browser_name))   : '',
    ctx.os             ? ctxRow('OS',             escapeHtml(ctx.os))             : '',
    ctx.device_type    ? ctxRow('Device type',   escapeHtml(ctx.device_type))    : '',
    ctx.screen_size    ? ctxRow('Screen',         escapeHtml(ctx.screen_size))    : '',
    ctxRow('Network',         ctx.network_type ? escapeHtml(ctx.network_type) : emptyValue()),
    ctxRow('Mic permission',  permBadge(ctx.mic_permission_status)),
    ctxRow('Camera perm.',    permBadge(ctx.camera_permission_status)),
    ctxRow('Speech API',      boolBadge(ctx.speech_recognition_supported)),
    ctxRow('Speech enabled',  boolBadge(ctx.speech_recognition_enabled)),
    ctx.current_page   ? ctxRow('Page at submit', `<span style="font-size:11px;">${escapeHtml(ctx.current_page)}</span>`) : '',
  ].filter(Boolean).join('');

  return `
    <tr><td style="padding:18px 0 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Technical Context</p>
      <div style="border:1px solid #eef0f3;border-radius:8px;overflow:hidden;">
        ${sessionRows ? `
        <div style="background:#f0f4ff;padding:8px 14px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6366f1;">Interview Session</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sessionRows}</table>
        </div>` : ''}
        <div style="background:#f9fafb;padding:8px 14px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Browser &amp; Device</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${deviceRows}</table>
        </div>
      </div>
    </td></tr>`;
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

export function buildFeedbackEmailHtml(p: FeedbackPayload): string {
  const { label, severity } = assessFeedback(p);
  const sc = SEVERITY_COLORS[severity];

  const wouldUse =
    p.wouldUseAgain === null
      ? emptyValue()
      : p.wouldUseAgain
        ? '<strong style="color:#15803d;">Yes</strong>'
        : '<strong style="color:#b91c1c;">No</strong>';

  const meta = [
    ['Name', escapeHtml(p.name)],
    ['Email', `<a href="mailto:${encodeURIComponent(p.email)}" style="color:#4f46e5;">${escapeHtml(p.email)}</a>`],
    ['User ID', p.userId ? escapeHtml(p.userId) : emptyValue()],
    ['Would use again', wouldUse],
    ['Page', p.pageUrl ? escapeHtml(p.pageUrl) : emptyValue()],
    ['Device / browser', p.browserInfo ? escapeHtml(p.browserInfo) : emptyValue()],
    ['Submitted', escapeHtml(formatIST(p.createdAt))],
  ]
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:5px 12px 5px 0;font-size:12px;color:#6b7280;white-space:nowrap;vertical-align:top;">${k}</td>
        <td style="padding:5px 0;font-size:13px;color:#111827;word-break:break-word;">${v}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr>
      <td style="padding:20px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#e0e7ff;">InterviewEra Feedback</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.25;">${ratingStars(p.rating)} &nbsp;${p.rating}/5</p>
        <div style="margin-top:12px;">
          <span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:.07em;padding:4px 12px;border-radius:999px;background:${sc.bg};color:${sc.fg};">${severity.toUpperCase()} SEVERITY</span>
          <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,0.18);color:#ffffff;">${escapeHtml(label)}</span>
          ${
            p.screenshotUrl
              ? `<span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px;background:#ffffff;color:#4f46e5;">📎 Screenshot attached</span>`
              : ''
          }
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 24px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${meta}</table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${section('What they liked', p.likedText.trim() ? nl2br(escapeHtml(p.likedText)) : emptyValue())}
          ${section('What confused them', p.confusionText.trim() ? nl2br(escapeHtml(p.confusionText)) : emptyValue())}
          ${section('Bugs / issues', p.bugsText.trim() ? nl2br(escapeHtml(p.bugsText)) : emptyValue())}
          ${p.screenshotUrl ? screenshotSection(p.screenshotUrl) : ''}
          ${buildContextSection(p.sessionContext)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #eef0f3;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">Reply directly to reach ${escapeHtml(p.name)}. Stored in the <code>feedbacks</code> table for analytics.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text fallback for clients that don't render HTML. */
export function buildFeedbackEmailText(p: FeedbackPayload): string {
  const { label, severity } = assessFeedback(p);
  const yn = p.wouldUseAgain === null ? 'not provided' : p.wouldUseAgain ? 'Yes' : 'No';
  const ctx = p.sessionContext;

  const contextLines = ctx
    ? [
        ``,
        `── Technical Context ──`,
        `Session ID:          ${ctx.session_id ?? '—'}`,
        `Role:                ${ctx.interview_role ?? '—'}`,
        `Interview type:      ${ctx.interview_type ?? '—'}`,
        `Difficulty:          ${ctx.difficulty_level ?? '—'}`,
        `Duration:            ${formatDuration(ctx.interview_duration_seconds)}`,
        `Browser:             ${ctx.browser_name ?? '—'}`,
        `OS:                  ${ctx.os ?? '—'}`,
        `Device type:         ${ctx.device_type ?? '—'}`,
        `Screen:              ${ctx.screen_size ?? '—'}`,
        `Network:             ${ctx.network_type ?? '—'}`,
        `Mic permission:      ${ctx.mic_permission_status ?? '—'}`,
        `Camera permission:   ${ctx.camera_permission_status ?? '—'}`,
        `Speech API:          ${ctx.speech_recognition_supported != null ? String(ctx.speech_recognition_supported) : '—'}`,
        `Speech enabled:      ${ctx.speech_recognition_enabled != null ? String(ctx.speech_recognition_enabled) : '—'}`,
        `Page at submit:      ${ctx.current_page ?? '—'}`,
      ]
    : [];

  return [
    `[${severity.toUpperCase()}] InterviewEra Feedback — ${label}`,
    `Rating: ${p.rating}/5`,
    ``,
    `Name: ${p.name}`,
    `Email: ${p.email}`,
    `User ID: ${p.userId ?? 'not provided'}`,
    `Would use again: ${yn}`,
    `Page: ${p.pageUrl || 'not provided'}`,
    `Device/browser: ${p.browserInfo || 'not provided'}`,
    `Submitted: ${formatIST(p.createdAt)}`,
    ``,
    `What they liked:`,
    p.likedText.trim() || '(not provided)',
    ``,
    `What confused them:`,
    p.confusionText.trim() || '(not provided)',
    ``,
    `Bugs / issues:`,
    p.bugsText.trim() || '(not provided)',
    ``,
    `Screenshot: ${p.screenshotUrl ?? '(none attached)'}`,
    ...contextLines,
  ].join('\n');
}

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Sends the feedback notification to the founder. Returns true on success.
 * Never throws — callers decide what to do when delivery fails (the row is
 * already persisted, so a failure here is recoverable).
 */
export async function sendFeedbackNotification(p: FeedbackPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error('[feedback] RESEND_API_KEY not set — skipping founder email');
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: founderEmail(),
      replyTo: p.email,
      subject: buildSubject(p),
      html: buildFeedbackEmailHtml(p),
      text: buildFeedbackEmailText(p),
    });
    if (error) {
      console.error('[feedback] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[feedback] Email send threw:', err);
    return false;
  }
}
