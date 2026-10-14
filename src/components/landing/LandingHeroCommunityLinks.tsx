import { CommunityPlatformIcon } from '@/components/community/CommunityIcons';

const HERO_WHATSAPP_GROUPS = [
  {
    label: 'Interview Resources',
    href: 'https://chat.whatsapp.com/FN4U7rggRCP6wcmkQ4iGgR',
  },
  {
    label: 'Jobs & Internships',
    href: 'https://chat.whatsapp.com/Ju2k4lA8alU9AZbtrTJEd2',
  },
] as const;

/**
 * Compact WhatsApp text links under the hero visual — Server Component.
 * Plain anchors avoid pulling the community analytics client into the LCP graph.
 * Hub/widget placements still use tracked CommunityLink.
 */
export default function LandingHeroCommunityLinks() {
  return (
    <div className="mt-4 w-full text-center sm:mt-5" aria-label="InterviewEra WhatsApp communities">
      <p className="ie-lh-text-primary text-[13px] font-semibold leading-snug sm:text-[13.5px]">
        Free WhatsApp groups for placement prep &amp; hiring updates
      </p>
      <p className="ie-lh-text-secondary mt-1 text-[12px] leading-relaxed">
        Resources, tips, and job alerts — join what fits you
      </p>
      <ul className="mt-2.5 flex list-none flex-wrap items-center justify-center gap-x-2 gap-y-2 p-0 sm:gap-x-3">
        {HERO_WHATSAPP_GROUPS.map((group) => (
          <li key={group.href}>
            <a
              href={group.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-wa-link ie-lh-text-accent inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2.5 text-[14.5px] font-semibold no-underline sm:text-[15px]"
            >
              <CommunityPlatformIcon
                platformId="whatsapp_community"
                className="hero-wa-link__icon size-4 shrink-0"
              />
              <span className="hero-wa-link__label">{group.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
