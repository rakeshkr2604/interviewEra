import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
// Shared with the free-tool Bento previews — same visible "sample content" disclosure tag,
// imported directly here so it renders correctly wherever this frame is used.
import '@/components/landing/LandingHomeSections.css';

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
        'relative overflow-hidden rounded-[var(--ie-radius-lg)] border',
        'border-[color-mix(in_srgb,var(--accent-primary)_16%,var(--card-border))]',
        'bg-[color-mix(in_srgb,var(--bg-secondary)_58%,var(--card-bg))]',
        'shadow-[0_12px_32px_-22px_color-mix(in_srgb,var(--accent-primary)_38%,transparent)]',
        className,
      )}
      role="img"
      aria-label={label}
    >
      {/* Visible disclosure — these are illustrative product mockups, not live customer data. */}
      <span className="ie-bento-preview__tag">Illustrative</span>
      {children}
    </div>
  );
}
