import type { LucideIcon } from 'lucide-react';

interface DashboardMetricTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  compact?: boolean;
}

export function DashboardMetricTile({
  label,
  value,
  icon: Icon,
  subtext,
  compact = false,
}: DashboardMetricTileProps) {
  return (
    <div
      className={
        compact
          ? 'min-w-0 rounded-xl px-2 py-2.5 sm:px-4 sm:py-3.5 lg:px-5 lg:py-4'
          : 'min-w-0 rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 lg:px-5 lg:py-4'
      }
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className={`flex items-start gap-2 ${compact ? 'flex-col sm:flex-row sm:gap-2.5 lg:gap-3' : 'gap-2.5 lg:gap-3'}`}>
        <div
          className={
            compact
              ? 'flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8 lg:size-9'
              : 'flex size-8 shrink-0 items-center justify-center rounded-lg lg:size-9'
          }
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon size={compact ? 14 : 16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              compact
                ? 'text-[8px] font-bold uppercase leading-tight tracking-[0.08em] sm:text-[10px] sm:tracking-[0.12em]'
                : 'text-[10px] font-bold uppercase tracking-[0.12em] leading-tight'
            }
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
          <p
            className={
              compact
                ? 'mt-0.5 text-sm font-bold tabular-nums leading-tight sm:text-lg lg:text-xl'
                : 'mt-0.5 text-base font-bold tabular-nums leading-tight sm:text-lg lg:text-xl'
            }
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
