import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared chrome for lightweight marketing product previews. */
export function ProductPreviewFrame({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name for decorative product UI */
  label: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--ie-radius-lg)] border',
        'border-[color-mix(in_srgb,var(--accent-primary)_16%,var(--card-border))]',
        'bg-[color-mix(in_srgb,var(--bg-secondary)_58%,var(--card-bg))]',
        'shadow-[0_12px_32px_-22px_color-mix(in_srgb,var(--accent-primary)_38%,transparent)]',
        className,
      )}
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}
