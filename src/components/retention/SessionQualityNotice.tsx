import type { SessionQualityFeedback } from '@/lib/retention/quality-feedback';

export function SessionQualityNotice({ feedback }: { feedback: SessionQualityFeedback }) {
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
        Session score:{' '}
        <span style={{ color: 'var(--text-primary)' }}>{feedback.sessionScore.toFixed(1)}</span>
        {' / 10 · Minimum required: '}
        <span style={{ color: 'var(--text-primary)' }}>
          {feedback.minSessionScore.toFixed(1)}
        </span>
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {feedback.suggestion}
      </p>
    </div>
  );
}
