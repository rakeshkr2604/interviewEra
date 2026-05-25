import { Resend } from 'resend';

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
  createdAt: Date;
}

// ─── Derived metadata ─────────────────────────────────────────────────────────

/** Short category used in the subject line + priority badge. */
export function categorize(p: FeedbackPayload): {
  label: string;
  priority: 'high' | 'medium' | 'low';
} {
  if (p.bugsText.trim()) return { label: 'Bug Report', priority: 'high' };
  if (p.rating <= 2) return { label: 'Confusing UX', priority: 'high' };
  if (p.confusionText.trim()) return { label: 'Confusing UX', priority: 'medium' };
  if (p.rating >= 4) return { label: 'Positive Feedback', priority: 'low' };
  return { label: 'General Feedback', priority: 'medium' };
}

export function buildSubject(p: FeedbackPayload): string {
  const { label } = categorize(p);
  return `[InterviewEra Feedback] Rating: ${p.rating}/5 — ${label}`;
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

const PRIORITY_COLORS: Record<'high' | 'medium' | 'low', { bg: string; fg: string }> = {
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

// ─── Email HTML ───────────────────────────────────────────────────────────────

export function buildFeedbackEmailHtml(p: FeedbackPayload): string {
  const { label, priority } = categorize(p);
  const pc = PRIORITY_COLORS[priority];

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
        <div style="margin-top:10px;">
          <span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:${pc.bg};color:${pc.fg};">${escapeHtml(label)} · ${priority.toUpperCase()} PRIORITY</span>
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
function buildFeedbackEmailText(p: FeedbackPayload): string {
  const { label, priority } = categorize(p);
  const yn = p.wouldUseAgain === null ? 'not provided' : p.wouldUseAgain ? 'Yes' : 'No';
  return [
    `InterviewEra Feedback — ${label} (${priority} priority)`,
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
