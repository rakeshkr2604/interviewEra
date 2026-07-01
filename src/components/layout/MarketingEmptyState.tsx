import { IE_ALERT_BANNER_CLASS } from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

interface MarketingEmptyStateProps {
  message: string;
  className?: string;
}

/**
 * Shared empty-state banner for marketing lists (blog search, resources, etc.).
 */
export function MarketingEmptyState({ message, className }: MarketingEmptyStateProps) {
  return (
    <p
      role="status"
      className={cn(IE_ALERT_BANNER_CLASS, 'text-center text-sm font-normal', className)}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
        color: 'var(--text-muted)',
      }}
    >
      {message}
    </p>
  );
}
