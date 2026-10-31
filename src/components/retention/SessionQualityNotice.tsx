import type { SessionQualityFeedback } from '@/lib/retention/quality-feedback';

/**
 * The stat line must match whichever criterion actually failed — a session
 * can score well above minSessionScore and still miss the streak (e.g.
 * questions skipped), so always showing the score line there would read as
 * "your score was too low" when it wasn't.
 */
function statLine(feedback: SessionQualityFeedback): { label: string; value: string } {
  if (feedback.failedCriterion === 'questions_answered') {
    return {
      label: 'Questions answered',
      value: `${feedback.questionsAnswered} / ${feedback.totalQuestions} · Required: all answered`,
    };
  }
  if (feedback.failedCriterion === 'avg_duration') {
    return {
      label: 'Avg. answer duration',
      value: `${Math.round(feedback.avgAnswerDurationSec)}s / ${feedback.minAvgDurationSec}s minimum`,
    };
  }
  return {
    label: 'Session score',
    value: `${feedback.sessionScore.toFixed(1)} / 10 · Minimum required: ${feedback.minSessionScore.toFixed(1)}`,
  };
}

export function SessionQualityNotice({ feedback }: { feedback: SessionQualityFeedback }) {
  const stat = statLine(feedback);
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, transparent)',
        background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
      }}
      role="status"
    >
      <p className="font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {feedback.headline}
      </p>
      <p className="mt-2 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {stat.label}: <span style={{ color: 'var(--text-primary)' }}>{stat.value}</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {feedback.suggestion}
      </p>
    </div>
  );
}
