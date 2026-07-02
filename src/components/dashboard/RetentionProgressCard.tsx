import { Flame, Layers, Sparkles, Trophy } from 'lucide-react';
import { SessionQualityNotice } from '@/components/retention/SessionQualityNotice';
import type { RetentionTierProgressView } from '@/lib/retention/dashboard-tier-progress';
import { MAX_TIER } from '@/lib/retention/constants';
import type { SessionQualityFeedback } from '@/lib/retention/quality-feedback';
import { getTierPublicLabel } from '@/lib/retention/tier-copy';

export interface RetentionDashboardSnapshot {
  current_tier: number;
  current_streak: number;
  total_xp: number;
  total_sessions: number;
  weeklySessions?: number;
  bestDimensionLabel?: string | null;
  improvementTrend?: string | null;
  tierProgress?: RetentionTierProgressView | null;
  lastSessionQualityFeedback?: SessionQualityFeedback | null;
}

export function RetentionProgressCard({ snap }: { snap: RetentionDashboardSnapshot | null }) {
  if (!snap) return null;

  const tierLabel = getTierPublicLabel(snap.current_tier);
  const atMaxTier = snap.current_tier >= MAX_TIER;

  return (
    <section className="dashboard-section dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="dashboard-section-eyebrow">Placement track</p>
          <p className="dashboard-section-title">{tierLabel}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {[
            { icon: Layers, label: `Tier ${snap.current_tier}/${MAX_TIER}` },
            { icon: Flame, label: `${snap.current_streak === 1 ? '1 day' : `${snap.current_streak} days`} streak` },
            { icon: Trophy, label: `${snap.total_xp.toLocaleString('en-IN')} XP` },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
              }}
            >
              <Icon size={12} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>

      {atMaxTier ? (
        <div
          className="mt-4 flex gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--bg-secondary)',
          }}
        >
          <Sparkles className="shrink-0 opacity-90" size={18} aria-hidden style={{ color: 'var(--accent-primary)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Highest tier unlocked — keep quality sessions going to earn badges.
          </p>
        </div>
      ) : snap.tierProgress ? (
        <div className="mt-4">
          <div
            className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Progress to Tier {snap.tierProgress.targetTierNumber}</span>
            <span className="tabular-nums">{snap.tierProgress.sessionsProgressLabel}</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--bg-tertiary)' }}
            role="progressbar"
            aria-label={`Progress to tier ${snap.tierProgress.targetTierNumber}: ${snap.tierProgress.progressPercent}%`}
            aria-valuenow={snap.tierProgress.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-2 rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${snap.tierProgress.progressPercent}%`,
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Next:
            </span>{' '}
            {snap.tierProgress.nextUnlockHint}
          </p>
        </div>
      ) : null}

      {snap.lastSessionQualityFeedback ? (
        <div className="mt-4">
          <SessionQualityNotice feedback={snap.lastSessionQualityFeedback} />
        </div>
      ) : null}
    </section>
  );
}
