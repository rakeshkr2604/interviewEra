import Link from 'next/link';
import Image from 'next/image';
import { BrandTagline } from '@/components/brand/BrandTagline';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { BrandMarkIcon } from '@/components/brand/BrandMarkIcon';
import {
  BRAND_LOGO_VERTICAL_PATH,
  BRAND_MARK_PATH,
  BRAND_MONOGRAM_NAV_PATH,
  BRAND_WORDMARK_NAV_PATH,
} from '@/lib/brand/assets';
import { cn } from '@/lib/utils';

/** @deprecated Import from `@/lib/brand/assets` — re-exported for existing callers. */
export { BRAND_MARK_PATH };

export type BrandHomeLinkVariant = 'navbar' | 'footer';

type BrandHomeLinkProps = {
  /** Navbar uses horizontal lockup (or compact icon+wordmark); footer uses vertical lockup. */
  variant?: BrandHomeLinkVariant;
  /** Smaller navbar treatment (scrolled / mobile drawer): square icon + CSS wordmark. */
  compact?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  gapClassName?: string;
};

/** Marketing logo link — package-mapped lockups per context (Logo Package v1). */
export function BrandHomeLink({
  variant = 'footer',
  compact = false,
  className,
  iconClassName,
  wordmarkClassName,
  gapClassName,
}: BrandHomeLinkProps) {
  const isNav = variant === 'navbar';

  if (isNav && !compact) {
    return (
      <Link
        href="/"
        className={cn(
          'group inline-flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1 transition-opacity duration-200 hover:opacity-90',
          className,
        )}
        aria-label="InterviewEra home"
      >
        {/* Light: dark-ink package rasters (readable on light chrome — no plate/border). */}
        <span className="inline-flex min-w-0 items-center gap-2.5 dark:hidden">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-[3.25rem] sm:w-[3.25rem]">
            <Image
              src={BRAND_MONOGRAM_NAV_PATH}
              width={640}
              height={640}
              className={cn('h-full w-full object-contain', iconClassName)}
              alt=""
              priority
              unoptimized
            />
          </span>
          <span className="flex min-w-0 flex-col items-start justify-center gap-1">
            <Image
              src={BRAND_WORDMARK_NAV_PATH}
              width={720}
              height={180}
              className="h-5 w-auto max-w-[11rem] object-contain object-left sm:h-6 sm:max-w-[13rem]"
              alt="InterviewEra"
              priority
              unoptimized
            />
            <BrandTagline className="text-[9px] sm:text-[10px]" />
          </span>
        </span>

        {/* Dark: purple square + theme CSS wordmark/tagline (no white plate). */}
        <span className="hidden min-w-0 items-center gap-2.5 dark:inline-flex">
          <BrandMarkIcon
            size={52}
            priority
            className={cn(
              'h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem]',
              iconClassName,
            )}
          />
          <span className="flex min-w-0 flex-col items-start justify-center gap-1">
            <BrandWordmarkSplit
              className={cn(
                'text-[1.125rem] tracking-[-0.04em] sm:text-[1.25rem]',
                wordmarkClassName,
              )}
              interviewClassName="font-semibold"
              eraClassName="font-bold"
            />
            <BrandTagline className="text-[9px] sm:text-[10px]" />
          </span>
        </span>
      </Link>
    );
  }

  if (!isNav) {
    return (
      <Link
        href="/"
        className={cn(
          'group inline-flex min-w-0 max-w-[14rem] flex-col items-start transition-opacity duration-200 hover:opacity-95',
          className,
        )}
        aria-label="InterviewEra home"
      >
        {/* Light: primary vertical lockup — no CSS plate/ring (asset is white-first). */}
        <span className="inline-flex w-full flex-col items-start dark:hidden">
          <Image
            src={BRAND_LOGO_VERTICAL_PATH}
            width={180}
            height={125}
            className={cn('h-auto w-full max-w-[11.5rem] object-contain object-left', iconClassName)}
            alt="InterviewEra"
            quality={95}
          />
        </span>
        {/* Dark: no boxed plate — mark + theme wordmark + tagline. */}
        <span className="hidden w-full flex-col items-start gap-2 dark:inline-flex">
          <BrandMarkIcon size={48} className="size-12" />
          <BrandWordmarkSplit
            className="text-lg tracking-[-0.04em]"
            interviewClassName="font-semibold"
            eraClassName="font-bold"
          />
          <BrandTagline className="text-[10px]" />
        </span>
      </Link>
    );
  }

  // Compact navbar / mobile drawer — square mark + theme-adaptive wordmark
  const size = compact ? 36 : 40;
  const resolvedIcon =
    iconClassName ?? (compact ? 'h-9 w-9 shrink-0' : 'h-10 w-10 shrink-0');
  const resolvedGap = gapClassName ?? 'gap-2.5 sm:gap-3';

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
      <BrandMarkIcon
        size={size}
        className={cn(
          'transition-opacity duration-200 group-hover:opacity-90',
          resolvedIcon,
        )}
      />
      <BrandWordmarkSplit
        className={cn(
          'min-w-0 tracking-[-0.04em] transition-opacity duration-200 group-hover:opacity-90',
          wordmarkClassName ?? 'text-[1.0625rem] sm:text-lg',
        )}
      />
    </Link>
  );
}
