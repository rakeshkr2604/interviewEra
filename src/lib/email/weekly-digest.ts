import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores } from '@/types/app.types';
import { getBaseUrl } from '@/lib/server/get-base-url';

const FROM_EMAIL = 'InterviewEra <transactional@interviewera.com>';
const REPLY_TO = 'support@interviewera.com';

// ─── Unsubscribe token helpers ────────────────────────────────────────────────

export function generateUnsubToken(userId: string): string {
  if (!process.env.UNSUBSCRIBE_SECRET) {
    throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  }
  return createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex');
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubToken(userId), 'hex');
    const actual = Buffer.from(token, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ─── Digest data types ────────────────────────────────────────────────────────

interface DigestUser {
  id: string;
  email: string;
  name: string | null;
}

interface DigestData {
  user: DigestUser;
  lastWeekCount: number;
  lastWeekAvg: number;
  prevWeekAvg: number | null;
  weakestDimension: string | null;
  weakestScore: number | null;
}

// ─── Dimension label map ──────────────────────────────────────────────────────

const DIM_LABELS: Record<keyof DimensionScores, string> = {
  communication_clarity: 'Communication Clarity',
  technical_depth: 'Technical Depth',
  answer_structure: 'Answer Structure',
  confidence: 'Confidence',
  relevance: 'Relevance',
};

// ─── Compute weekly digest for a single user ─────────────────────────────────

async function buildUserDigest(user: DigestUser): Promise<DigestData | null> {
  const supabase = createServiceClient();
  const now = new Date();

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(now.getDate() - 14);

  // Fetch last-14-day completed interviews to check activity
  const { data: allInterviews } = await supabase
    .from('interviews')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', prevWeekStart.toISOString())
    .order('completed_at', { ascending: false });

  if (!allInterviews || allInterviews.length === 0) return null;

  const lastWeekInterviews = allInterviews.filter(
    (i) => new Date(i.completed_at as string) >= lastWeekStart,
  );
  const prevWeekInterviews = allInterviews.filter(
    (i) =>
      new Date(i.completed_at as string) >= prevWeekStart &&
      new Date(i.completed_at as string) < lastWeekStart,
  );

  if (lastWeekInterviews.length === 0) return null;

  // Fetch reports for last-week interviews
  const lastWeekIds = lastWeekInterviews.map((i) => i.id as string);
  const { data: lastWeekReports } = await supabase
    .from('reports')
    .select('overall_score')
    .in('interview_id', lastWeekIds);

  if (!lastWeekReports || lastWeekReports.length === 0) return null;

  const lastWeekAvg =
    lastWeekReports.reduce((s, r) => s + (r.overall_score as number), 0) /
    lastWeekReports.length;

  // Previous week avg
  let prevWeekAvg: number | null = null;
  if (prevWeekInterviews.length > 0) {
    const prevWeekIds = prevWeekInterviews.map((i) => i.id as string);
    const { data: prevReports } = await supabase
      .from('reports')
      .select('overall_score')
      .in('interview_id', prevWeekIds);
    if (prevReports && prevReports.length > 0) {
      prevWeekAvg =
        prevReports.reduce((s, r) => s + (r.overall_score as number), 0) /
        prevReports.length;
    }
  }

  // Find weakest dimension — fetch evaluations for last-week answers
  const { data: lastWeekQuestions } = await supabase
    .from('questions')
    .select('id')
    .in('interview_id', lastWeekIds);

  let weakestDimension: string | null = null;
  let weakestScore: number | null = null;

  if (lastWeekQuestions && lastWeekQuestions.length > 0) {
    const questionIds = lastWeekQuestions.map((q) => q.id as string);
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .in('question_id', questionIds);

    if (answers && answers.length > 0) {
      const answerIds = answers.map((a) => a.id as string);
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('dimension_scores')
        .in('answer_id', answerIds);

      if (evaluations && evaluations.length > 0) {
        const sums: DimensionScores = {
          communication_clarity: 0,
          technical_depth: 0,
          answer_structure: 0,
          confidence: 0,
          relevance: 0,
        };
        for (const ev of evaluations) {
          const d = ev.dimension_scores as DimensionScores;
          sums.communication_clarity += d.communication_clarity;
          sums.technical_depth += d.technical_depth;
          sums.answer_structure += d.answer_structure;
          sums.confidence += d.confidence;
          sums.relevance += d.relevance;
        }
        const n = evaluations.length;
        let minScore = Infinity;
        let minKey: keyof DimensionScores | null = null;
        for (const key of Object.keys(sums) as (keyof DimensionScores)[]) {
          const avg = sums[key] / n;
          if (avg < minScore) {
            minScore = avg;
            minKey = key;
          }
        }
        if (minKey) {
          weakestDimension = DIM_LABELS[minKey];
          weakestScore = Math.round((sums[minKey] / n) * 10) / 10;
        }
      }
    }
  }

  return {
    user,
    lastWeekCount: lastWeekInterviews.length,
    lastWeekAvg: Math.round(lastWeekAvg * 10) / 10,
    prevWeekAvg: prevWeekAvg !== null ? Math.round(prevWeekAvg * 10) / 10 : null,
    weakestDimension,
    weakestScore,
  };
}

// ─── Build HTML email ─────────────────────────────────────────────────────────

function buildEmailHtml(data: DigestData): string {
  const { user, lastWeekCount, lastWeekAvg, prevWeekAvg, weakestDimension, weakestScore } = data;
  const name = user.name ?? 'there';

  const deltaStr =
    prevWeekAvg !== null
      ? ` (${lastWeekAvg >= prevWeekAvg ? '+' : ''}${Math.round((lastWeekAvg - prevWeekAvg) * 10) / 10} from previous week)`
      : '';

  const weakLine =
    weakestDimension && weakestScore !== null
      ? `<p style="margin:8px 0;color:#374151;">Weakest area: <strong>${weakestDimension}</strong> (${weakestScore} avg) — focus on this in your next session</p>`
      : '';

  const unsubToken = generateUnsubToken(user.id);
  const unsubUrl = `${getBaseUrl()}/api/email/unsubscribe?userId=${encodeURIComponent(user.id)}&token=${unsubToken}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 16px;color:#111827;font-size:15px;">Hi ${name},</p>
    <p style="margin:8px 0;color:#374151;">Last week: <strong>${lastWeekCount} interview${lastWeekCount !== 1 ? 's' : ''} completed</strong>, avg score <strong>${lastWeekAvg}/10</strong>${deltaStr}</p>
    ${weakLine}
    <div style="margin-top:24px;">
      <a href="${getBaseUrl()}/interview/new" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;">Practice Now →</a>
    </div>
    <p style="margin-top:32px;font-size:12px;color:#9ca3af;">
      <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe from weekly digest</a>
    </p>
  </div>
</body>
</html>`;
}

// ─── Send digest to a single user ────────────────────────────────────────────

async function sendDigest(data: DigestData): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.user.email,
    replyTo: REPLY_TO,
    subject: `Your InterviewEra weekly report — ${date}`,
    html: buildEmailHtml(data),
  });

  if (error) {
    console.error(`[weekly-digest] Failed to send to ${data.user.email}:`, error);
  }
}

// ─── Main: run digest for all eligible users ──────────────────────────────────

export async function runWeeklyDigest(): Promise<{ sent: number; skipped: number }> {
  const supabase = createServiceClient();

  // Fetch all users who have not unsubscribed
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email_digest_unsubscribed', false);

  if (error || !users) {
    console.error('[weekly-digest] Failed to fetch users:', error);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const digestData = await buildUserDigest(user as DigestUser);
    if (!digestData) {
      skipped++;
      continue;
    }
    await sendDigest(digestData);
    sent++;
  }

  return { sent, skipped };
}
