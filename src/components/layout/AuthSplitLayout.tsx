import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pairs marketing copy + form as one centered unit (avoids empty middle on wide viewports).
 * Columns are cross-axis centered on `lg+` so the shorter column doesn't leave the pair
 * looking bottom-heavy on one side.
 */
export function AuthSplitLayout({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-lg flex-col items-center gap-10 sm:max-w-xl sm:gap-11 lg:max-w-[53rem] lg:flex-row lg:items-center lg:justify-center lg:gap-10 xl:max-w-[55rem] xl:gap-12',
        className,
      )}
    >
      <div className="w-full min-w-0 max-w-md space-y-7 text-center lg:max-w-[26rem] lg:shrink-0 lg:text-left">
        {left}
      </div>
      <div className="w-full min-w-0 max-w-[24.25rem] lg:w-[24.25rem] lg:shrink-0">
        {right}
      </div>
    </div>
  );
}
