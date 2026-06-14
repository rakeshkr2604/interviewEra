import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CURRENT_PLAN_BADGE_LABEL } from '@/lib/pricing/copy';

export function CurrentPlanBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        'border-emerald-500/40 bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400',
        className,
      )}
    >
      {CURRENT_PLAN_BADGE_LABEL}
    </Badge>
  );
}
