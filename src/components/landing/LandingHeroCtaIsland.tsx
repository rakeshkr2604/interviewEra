import type { CSSProperties, ReactNode } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { cn } from '@/lib/utils';

/**
 * Hero CTAs as a Server Component shell + thin TrackedCtaLink client leaves.
 *
 * Auth-aware `/signup` → `/dashboard` swap was removed from the critical path:
 * middleware already sends signed-in users from `/signup` to `/dashboard`, and
 * the idle Supabase probe competed with LCP/TBT on mobile (Loop 16/17 traces).
 *
 * Hierarchy: CTAs → trust strip → audience line.
 * Primary keeps the `start_free_interview` key so hero signup reporting stays continuous.
 */
export default function LandingHeroCtaIsland({ trustStrip }: { trustStrip?: ReactNode }) {
  return (
    <div
      className="hero-cta-island ie-hero-enter max-w-[32rem]"
      style={{ '--ie-hero-delay': '140ms' } as CSSProperties}
    >
      <div className="hero-cta-island__actions flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
        <TrackedCtaLink
          href="/signup"
          ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
          ctaText="Create Free Account"
          section="hero"
          className="v3-btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold no-underline sm:w-auto sm:px-8"
          style={{
            color: '#fff',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Create Free Account
        </TrackedCtaLink>
        <TrackedCtaLink
          href="/#free-tools"
          ctaKey={CTA_KEYS.EXPLORE_FREE_TOOLS}
          ctaText="Explore Free Tools"
          section="hero_secondary"
          className="v3-btn-secondary hero-v3-btn-secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] px-6 py-3.5 text-[14.5px] font-semibold no-underline sm:w-auto sm:px-7 sm:text-[15px]"
          style={{
            borderColor: T.bord2,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Explore Free Tools
        </TrackedCtaLink>
      </div>

      {trustStrip ? <div className="mt-4 sm:mt-6">{trustStrip}</div> : null}

      <ul
        className="hero-audience-line mt-3.5 grid list-none grid-cols-1 gap-1.5 p-0 text-[13px] leading-snug sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-y-2 sm:text-[14px] sm:leading-relaxed"
        style={{ color: T.text2 }}
        aria-label="Who InterviewEra is for"
      >
        {(
          [
            { label: 'Students, freshers & interns', sep: T.ok },
            { label: 'Early-career professionals', sep: T.acc },
          ] as const
        ).map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                'inline-block size-[5px] shrink-0 rounded-full',
                i === 0 ? 'sm:mr-3' : 'sm:mx-3',
              )}
              style={{ background: item.sep }}
            />
            <span className="min-w-0">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
