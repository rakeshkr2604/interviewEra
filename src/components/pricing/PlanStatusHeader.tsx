import { CurrentPlanBadge } from '@/components/pricing/CurrentPlanBadge';
import { planExpiryStatusLine } from '@/lib/pricing/plan-status';

interface PlanStatusHeaderProps {
  planExpiresAt?: string | null;
  isActive?: boolean;
}

/** Current plan badge + expiry / days remaining when data exists. */
export function PlanStatusHeader({ planExpiresAt, isActive = true }: PlanStatusHeaderProps) {
  const statusLine =
    planExpiresAt && isActive
      ? planExpiryStatusLine(planExpiresAt, true)
      : planExpiresAt && !isActive
        ? planExpiryStatusLine(planExpiresAt, false)
        : null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
      <CurrentPlanBadge />
      {statusLine ? (
        <span
          className="max-w-[9.5rem] text-[11px] font-medium leading-snug tabular-nums text-emerald-700 dark:text-emerald-400"
          aria-live="polite"
        >
          {statusLine}
        </span>
      ) : null}
    </div>
  );
}
