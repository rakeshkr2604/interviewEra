import { Flame, Layers, Sparkles, Trophy } from 'lucide-react';
import type { RetentionTierProgressView } from '@/lib/retention/dashboard-tier-progress';
import { MAX_TIER } from '@/lib/retention/constants';
import { getTierPublicLabel } from '@/lib/retention/tier-copy';

export interface RetentionDashboardSnapshot {
  current_tier: number;
  current_streak: number;
  total_xp: number;
  total_sessions: number;
  /** Next-tier UX; absent when max tier or data incomplete. */
  tierProgress?: RetentionTierProgressView | null;
}

export function RetentionProgressCard({ snap }: { snap: RetentionDashboardSnapshot | null }) {
  if (!snap) {
    return (
      <div className="dashboard-premium-card px-5 py-5 sm:px-6 mb-6">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Progress tiers
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Tier tracking will appear after your next scored interview (retention migration required on the database).
        </p>
      </div>
    );
  }

  const tierLabel = getTierPublicLabel(snap.current_tier);
  const atMaxTier = snap.current_tier >= MAX_TIER;

  return (
    <div className="dashboard-premium-card px-5 py-5 sm:px-6 mb-6">
      <RetentionProgressTierDetails
        tierLabel={tierLabel}
        atMaxTier={atMaxTier}
        tierProgress={snap.tierProgress}
      />

      <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-3">
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Layers size={14} className="opacity-70 shrink-0" aria-hidden />
            Tier
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {snap.current_tier}
            <span className="text-base font-semibold opacity-70">{` / ${MAX_TIER}`}</span>
          </p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Flame size={14} className="opacity-70 shrink-0" aria-hidden />
            Quality streak
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {snap.current_streak}
            <span className="text-xs font-semibold ml-1 opacity-80">days</span>
          </p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trophy size={14} className="opacity-70 shrink-0" aria-hidden />
            Practice XP
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {snap.total_xp.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Sessions logged · {snap.total_sessions}
          </p>
        </div>
      </div>
    </div>
  );
}

function RetentionProgressTierDetails({
  tierLabel,
  atMaxTier,
  tierProgress,
}: {
  tierLabel: string;
  atMaxTier: boolean;
  tierProgress?: RetentionTierProgressView | null;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          Placement progression
        </p>
        <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
          {tierLabel}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Complete quality sessions to unlock advanced mock modes. Streak resets if you skip questions or rush answers.
        </p>

        {atMaxTier ? (
          <div
            className="mt-4 flex gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <Sparkles className="shrink-0 opacity-90" size={18} aria-hidden style={{ color: 'var(--accent-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Highest tier unlocked
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Mock panel mode and follow-up chains are yours. Keep your streak alive to earn badges.
              </p>
            </div>
          </div>
        ) : tierProgress ? (
          <div className="mt-4">
            <div
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs sm:text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>
                Progress to Tier {tierProgress.targetTierNumber}
              </span>
              <span className="tabular-nums">{tierProgress.sessionsProgressLabel}</span>
            </div>

            <div
              className="w-full rounded-full h-2 overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
              role="progressbar"
              aria-valuenow={tierProgress.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress toward tier ${tierProgress.targetTierNumber}`}
            >
              <div
                className="h-2 rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${tierProgress.progressPercent}%`,
                  backgroundColor: 'var(--accent-primary)',
                  maxWidth: '100%',
                }}
              />
            </div>

            <div className="flex justify-end mt-1">
              <span className="text-[11px] sm:text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {tierProgress.scoreProgressLabel}
              </span>
            </div>

            <p className="text-xs sm:text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Next unlock:
              </span>{' '}
              {tierProgress.nextUnlockHint}
            </p>

            <div
              className="mt-4 p-3 rounded-lg border max-w-xl"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)',
                  background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                }}
              >
                <p
                  className="text-xs sm:text-sm font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Tier {tierProgress.targetTierNumber}: {tierProgress.tierDisplayName}
                </p>
                <p className="text-[11px] sm:text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {tierProgress.tierDescription ??
                    `Unlock “${tierProgress.tierDisplayName}” to access the next progression track.`}
                </p>
              </div>
            </div>
        ) : null}
      </div>
    </div>
  );
}
