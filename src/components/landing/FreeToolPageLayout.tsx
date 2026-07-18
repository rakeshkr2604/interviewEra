import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

export type FreeToolBullet =
  | { icon: LucideIcon; text: string }
  | { icon: LucideIcon; title: string; body: string };

interface FreeToolPageLayoutProps {
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  description: string;
  bullets: readonly FreeToolBullet[];
  /** Vertical list (default) or horizontal 3-up trust row */
  bulletsLayout?: 'stack' | 'row';
  /** e.g. STAR legend grid — rendered after description, before bullets */
  leftSlot?: ReactNode;
  /** Cross-links under bullets */
  footerSlot?: ReactNode;
  /** Full-width band under both columns (e.g. trust row spanning the page) */
  bottomSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Shared shell for /tools/* marketing pages — matches ATS checker: orbs, grid, typography, `LANDING_PAGE_CONTAINER`.
 */
export function FreeToolPageLayout({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  bullets,
  bulletsLayout = 'stack',
  leftSlot,
  footerSlot,
  bottomSlot,
  children,
}: FreeToolPageLayoutProps) {
  return (
    <main
      className="ie-landing-type relative overflow-hidden px-4 pb-3 pt-3 sm:px-5 sm:pb-2.5 sm:pt-5 md:pt-6"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[18%] top-[-16%] h-[min(22rem,72vw)] w-[min(22rem,72vw)] rounded-full blur-[100px] sm:left-0"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 26%, transparent)' }}
        />
        <div
          className="absolute -right-[12%] top-[28%] h-[min(16rem,55vw)] w-[min(16rem,55vw)] rounded-full blur-[90px]"
          style={{ background: 'color-mix(in srgb, #7c3aed 20%, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.2] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_-10%,black,transparent)]"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className={cn('relative', LANDING_PAGE_CONTAINER)}>
        {/* Mobile-first: form (tool) first, marketing copy below; desktop keeps copy | form */}
        <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-16">
          <div className="order-2 mx-auto max-w-xl space-y-5 text-center sm:space-y-7 lg:order-1 lg:col-span-5 lg:mx-0 lg:max-w-none lg:pt-2 lg:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              <EyebrowIcon className="size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              {eyebrow}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl sm:leading-[1.08] md:text-5xl md:leading-[1.05]">
                {title}
              </h1>
              <p className="text-sm leading-relaxed sm:text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            </div>

            {leftSlot}

            <ul
              className={cn(
                bulletsLayout === 'row'
                  ? 'mx-auto grid max-w-lg grid-cols-1 gap-2.5 text-left sm:grid-cols-3 sm:gap-3 lg:mx-0 lg:max-w-none'
                  : 'mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none',
              )}
            >
              {bullets.map((item, i) => {
                const Icon = item.icon;
                const key = 'text' in item ? item.text : item.title;
                const isRow = bulletsLayout === 'row';
                return (
                  <li
                    key={`${key}-${i}`}
                    className={cn(
                      isRow
                        ? [
                            'group flex flex-row items-center gap-3 rounded-xl border px-3 py-3 text-left sm:flex-col sm:items-center sm:gap-2 sm:px-2 sm:py-3 sm:text-center',
                            'border-(--card-border) bg-[color-mix(in_srgb,var(--card-bg)_88%,transparent)]',
                            'shadow-none transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out',
                            'hover:-translate-y-0.5 hover:scale-[1.04]',
                            'hover:border-[color-mix(in_srgb,var(--accent-primary)_40%,var(--card-border))]',
                            'hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--card-bg))]',
                            'hover:shadow-[0_10px_28px_-12px_color-mix(in_srgb,var(--accent-primary)_35%,transparent)]',
                            'motion-reduce:transform-none motion-reduce:transition-none',
                          ].join(' ')
                        : 'flex gap-3 text-sm sm:text-base',
                    )}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-out motion-reduce:transform-none',
                        isRow
                          ? 'size-9 group-hover:scale-110 sm:size-9'
                          : 'mt-0.5 size-9',
                      )}
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span
                      className={cn(
                        'leading-snug',
                        isRow ? 'text-xs font-medium sm:text-[10px] sm:font-medium md:text-xs' : 'text-sm leading-relaxed sm:text-base',
                      )}
                    >
                      {'text' in item ? (
                        item.text
                      ) : (
                        <>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </span>
                          <span className="mt-0.5 block font-normal">{item.body}</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            {footerSlot}
          </div>

          <div className="order-1 mx-auto w-full max-w-xl lg:order-2 lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0">
            {children}
          </div>
        </div>

        {bottomSlot ? <div className="mt-5 sm:mt-7">{bottomSlot}</div> : null}
      </div>
    </main>
  );
}
