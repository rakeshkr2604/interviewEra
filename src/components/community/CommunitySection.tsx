import Link from 'next/link';
import { COMMUNITY_COPY, COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { getPlatformsForSurface } from '@/lib/community/selectors';
import { CommunityCard } from '@/components/community/CommunityCard';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
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
      className={cn(LANDING_HOME_SECTION, className)}
      aria-labelledby="community-stay-updated-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>
            {COMMUNITY_COPY.sectionEyebrow}
          </span>
          <h2
            id="community-stay-updated-heading"
            className={LANDING_HOME_HEADING}
          >
            {COMMUNITY_COPY.sectionTitle}
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
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
