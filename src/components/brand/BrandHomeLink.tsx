import Link from 'next/link';
import Image from 'next/image';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { cn } from '@/lib/utils';

export const BRAND_MARK_PATH = '/brand/logos/icon-only.svg';

export type BrandHomeLinkVariant = 'navbar' | 'footer';

type BrandHomeLinkProps = {
  /** Both variants render the Interview + Era wordmark (no .com); they differ only in size/weight. */
  variant?: BrandHomeLinkVariant;
  /** Smaller navbar mark (e.g. mobile drawer). */
  compact?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  gapClassName?: string;
};

/** Marketing logo: IE tile + Interview + Era wordmark (no .com), used in navbar and footer. */
export function BrandHomeLink({
  variant = 'footer',
  compact = false,
  className,
  iconClassName,
  wordmarkClassName,
  gapClassName,
}: BrandHomeLinkProps) {
  const isNav = variant === 'navbar';
  const size = variant === 'footer' ? 32 : compact ? 36 : 40;
  const resolvedIcon =
    iconClassName ??
    (isNav ? (compact ? 'h-9 w-9 shrink-0' : 'h-10 w-10 shrink-0') : 'h-8 w-8');
  const resolvedGap =
    gapClassName ?? (isNav ? 'gap-2.5 sm:gap-3' : 'gap-2.5');

  return (
    <Link
      href="/"
      className={cn(
        'group inline-flex min-w-0 items-center transition-opacity duration-200 hover:opacity-90',
        resolvedGap,
        className,
      )}
      aria-label="InterviewEra home"
    >
      <Image
        src={BRAND_MARK_PATH}
        width={size}
        height={size}
        className={cn('shrink-0 transition-opacity duration-200 group-hover:opacity-90', resolvedIcon)}
        alt=""
      />
      {isNav ? (
        <BrandWordmarkSplit
          className={cn(
            'min-w-0 tracking-[-0.04em] transition-opacity duration-200 group-hover:opacity-90',
            wordmarkClassName ?? 'text-[1.0625rem] sm:text-lg',
          )}
        />
      ) : (
        <BrandWordmarkSplit
          interviewClassName="font-semibold"
          eraClassName="font-semibold"
          className={cn(
            'min-w-0 tracking-[-0.03em] transition-opacity duration-200 group-hover:opacity-90',
            wordmarkClassName ?? 'text-lg',
          )}
        />
      )}
    </Link>
  );
}
