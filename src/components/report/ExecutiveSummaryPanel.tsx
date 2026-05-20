import type { ReportInsights, SignalStrength, HiringSignal, ReadinessLevel } from '@/types/app.types';
import { ReportPanel } from '@/components/report/ReportPanel';

interface ExecutiveSummaryPanelProps {
  insights: ReportInsights;
}

function signalStyle(strength: SignalStrength): { background: string; color: string } {
  if (strength === 'strong')   return { background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)', color: 'var(--accent-success)' };
  if (strength === 'moderate') return { background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)', color: 'var(--text-primary)' };
  return                              { background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',  color: 'var(--accent-danger)' };
}

function hiringSignalStyle(signal: HiringSignal): { background: string; color: string; label: string } {
  if (signal === 'hire')       return { background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)', color: 'var(--accent-success)', label: 'Hire Signal' };
  if (signal === 'borderline') return { background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)', color: 'var(--text-primary)',    label: 'Borderline' };
  return                              { background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',  color: 'var(--accent-danger)',   label: 'Needs Prep' };
}

function readinessLabel(level: ReadinessLevel): string {
  if (level === 'ready')       return 'Placement Ready';
  if (level === 'developing')  return 'Developing';
  return 'Early Stage';
}

const SIGNAL_LABELS: Record<keyof ReportInsights['hiring_signals'], string> = {
  technical_ownership:       'Technical Ownership',
  communication_clarity:     'Communication',
  problem_solving:           'Problem Solving',
  confidence_under_pressure: 'Confidence',
  answer_structure:          'Answer Structure',
  relevance:                 'Relevance',
};

export function ExecutiveSummaryPanel({ insights }: ExecutiveSummaryPanelProps) {
  const { executive_summary, hiring_signals } = insights;
  const hStyle = hiringSignalStyle(executive_summary.hiring_signal);

  return (
    <ReportPanel eyebrow="Recruiter Assessment" title="Candidate intelligence" contentClassName="space-y-5">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
          style={hStyle}
        >
          {hStyle.label}
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          {readinessLabel(executive_summary.readiness_level)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Role fit confidence:{' '}
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {executive_summary.role_fit_confidence.toFixed(1)}/10
          </span>
        </span>
      </div>

      {/* Recruiter narrative */}
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}
      >
        &ldquo;{executive_summary.narrative}&rdquo;
      </p>

      {/* Strongest / weakest */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span style={{ color: 'var(--text-secondary)' }}>
          Strongest:{' '}
          <span className="font-semibold" style={{ color: 'var(--accent-success)' }}>
            {executive_summary.strongest_dimension}
          </span>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Weakest:{' '}
          <span className="font-semibold" style={{ color: 'var(--accent-danger)' }}>
            {executive_summary.weakest_dimension}
          </span>
        </span>
      </div>

      {/* Hiring signals grid */}
      <div>
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Hiring Signals
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(hiring_signals) as [keyof ReportInsights['hiring_signals'], SignalStrength][]).map(
            ([key, strength]) => {
              const style = signalStyle(strength);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                  style={{
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    border: '1.5px solid var(--card-border)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {SIGNAL_LABELS[key]}
                  </span>
                  <span
                    className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                    style={style}
                  >
                    {strength}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </ReportPanel>
  );
}
