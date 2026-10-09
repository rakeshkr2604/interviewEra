import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay';
import { CANDIDATE_RATING, TRUST_METRICS } from '@/lib/landing/trust-metrics';

export function AuthTrustProof() {
  const candidateMetric = TRUST_METRICS.find((item) => item.id === 'candidates');
  const interviewMetric = TRUST_METRICS.find((item) => item.id === 'interviews');
  const resumeMetric = TRUST_METRICS.find((item) => item.id === 'resume');
  if (!candidateMetric || !interviewMetric || !resumeMetric) return null;

  const letterMarkers = [
    { letter: 'C', label: candidateMetric.label },
    { letter: 'I', label: interviewMetric.label },
    { letter: 'A', label: resumeMetric.label },
  ] as const;

  return (
    <aside className="mx-auto w-full max-w-md text-left lg:mx-0" aria-label="InterviewEra platform trust data">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 -space-x-2" aria-label="Platform activity categories">
          {letterMarkers.map((marker, index) => (
            <span
              key={marker.letter}
              title={marker.label}
              className="grid size-9 place-items-center rounded-full border-2 text-xs font-bold"
              style={{
                zIndex: letterMarkers.length - index,
                borderColor: 'var(--page-bg, var(--card-bg))',
                color: index === 1 ? '#fff' : 'var(--accent-primary)',
                background:
                  index === 1
                    ? 'linear-gradient(135deg, var(--accent-primary), #6d28d9)'
                    : 'color-mix(in srgb, var(--accent-primary) 14%, var(--card-bg))',
              }}
              aria-label={marker.label}
            >
              {marker.letter}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {candidateMetric.value.toLocaleString('en-IN')}
            {candidateMetric.suffix} candidates practiced
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {interviewMetric.value.toLocaleString('en-IN')}
            {interviewMetric.suffix} AI mock interviews completed
          </p>
          <p className="mt-1 text-xs font-medium">
            <StarRatingDisplay className="tracking-wide text-amber-500" />{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {CANDIDATE_RATING.value}/{CANDIDATE_RATING.outOf} {CANDIDATE_RATING.label}
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}
