import Link from 'next/link';
import { COMMUNITY_COPY, COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { getPlatformsForSurface } from '@/lib/community/selectors';
import { CommunityCard } from '@/components/community/CommunityCard';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

interface CommunitySectionProps {
  className?: string;
  placement?: 'landing_section' | 'dashboard_card';
}

export function CommunitySection({
  className,
  placement = 'landing_section',
}: CommunitySectionProps) {
  const cards = getPlatformsForSurface('landing')
    .filter((p) => !p.comingSoon)
    .slice(0, 2);

  if (cards.length === 0) return null;

  return (
    <section
      className={cn('px-5 py-20 sm:py-24', className)}
      aria-labelledby="community-stay-updated-heading"
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 sm:px-5')}>
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--accent-hover)' }}
          >
            {COMMUNITY_COPY.sectionEyebrow}
          </span>
          <h2
            id="community-stay-updated-heading"
            className="mt-3 font-[family-name:var(--font-bricolage)] text-[clamp(1.625rem,3.4vw,2.625rem)] font-extrabold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {COMMUNITY_COPY.sectionTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {COMMUNITY_COPY.sectionSubtitle}
          </p>
        </div>

        <div
          className={cn(
            'mx-auto mt-10 grid max-w-4xl gap-4',
            cards.length === 1 ? 'max-w-md' : 'sm:grid-cols-2',
          )}
        >
          {cards.map((platform) => (
            <CommunityCard key={platform.id} platform={platform} placement={placement} />
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link
            href={COMMUNITY_HUB_PATH}
            className="text-sm font-semibold text-[var(--accent-primary)] underline-offset-2 transition-opacity hover:underline hover:opacity-80"
          >
            {COMMUNITY_COPY.sectionHubCta}
          </Link>
        </p>
      </div>
    </section>
  );
}
