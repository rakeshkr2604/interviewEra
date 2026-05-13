import { Flame, Layers, Trophy } from 'lucide-react';
import { getTierPublicLabel } from '@/lib/retention/tier-copy';

export interface RetentionDashboardSnapshot {
  current_tier: number;
  current_streak: number;
  total_xp: number;
  total_sessions: number;
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

  return (
    <div className="dashboard-premium-card px-5 py-5 sm:px-6 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-3">
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            <Layers size={14} className="opacity-70" aria-hidden />
            Tier
          </div>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {snap.current_tier}<span className="text-base font-semibold opacity-70"> / 4</span>
          </p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            <Flame size={14} className="opacity-70" aria-hidden />
            Quality streak
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {snap.current_streak}<span className="text-xs font-semibold ml-1 opacity-80">days</span>
          </p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            <Trophy size={14} className="opacity-70" aria-hidden />
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
