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
        'ie-lh-surface-88 overflow-hidden rounded-xl border',
        className,
      )}
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}
