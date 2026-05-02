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
  /** e.g. STAR legend grid — rendered after description, before bullets */
  leftSlot?: ReactNode;
  /** Cross-links under bullets */
  footerSlot?: ReactNode;
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
  leftSlot,
  footerSlot,
  children,
}: FreeToolPageLayoutProps) {
  return (
    <main
      className="ie-landing-type relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-14 md:pb-32 md:pt-20"
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
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-16">
          <div className="mx-auto max-w-xl space-y-7 text-center lg:col-span-5 lg:mx-0 lg:max-w-none lg:pt-2 lg:text-left">
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

            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
                {title}
              </h1>
              <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            </div>

            {leftSlot}

            <ul className="mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
              {bullets.map((item, i) => {
                const Icon = item.icon;
                const key = 'text' in item ? item.text : item.title;
                return (
                  <li key={`${key}-${i}`} className="flex gap-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="leading-relaxed">
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

          <div className="mx-auto w-full max-w-xl lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
