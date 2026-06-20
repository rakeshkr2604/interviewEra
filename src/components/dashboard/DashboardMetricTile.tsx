import type { LucideIcon } from 'lucide-react';

interface DashboardMetricTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
}

export function DashboardMetricTile({ label, value, icon: Icon, subtext }: DashboardMetricTileProps) {
  return (
    <div
      className="min-w-0 rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon size={16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em] leading-tight"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
          <p
            className="mt-0.5 text-base font-bold tabular-nums leading-tight sm:text-lg"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
          {subtext ? (
            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {subtext}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
