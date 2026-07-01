import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { CommunityCard } from '@/components/community/CommunityCard';
import { CommunityPageTracker } from '@/components/community/CommunityPageTracker';
import { ConnectWithInterviewEra } from '@/components/community/ConnectWithInterviewEra';
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader';
import { MarketingSectionHeader } from '@/components/layout/MarketingSectionHeader';
import {
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes';
import {
  COMMUNITY_COPY,
  COMMUNITY_FAQ,
  COMMUNITY_GUIDELINES,
  COMMUNITY_HUB_SECTIONS,
} from '@/lib/community/community';
import { getHubPlatformsBySection } from '@/lib/community/selectors';

const RESOURCE_LINKS = [
  {
    title: 'Placement interview guide',
    href: '/blog/how-to-prepare-for-placement-interviews',
    description: 'Structured prep plan for campus hiring season.',
  },
  {
    title: 'STAR method with examples',
    href: '/blog/what-is-star-method-with-examples',
    description: 'Answer behavioral questions with a clear framework.',
  },
  {
    title: 'Free question generator',
    href: '/tools/question-generator',
    description: 'Generate role-specific interview questions instantly.',
  },
  {
    title: 'Resume & ATS tools',
    href: '/tools',
    description: 'Free tools to sharpen your resume before mocks.',
  },
] as const;

export function CommunityHubPage() {
  return (
    <BlogMarketingShell backHref="/" backLabel="Home">
      <CommunityPageTracker />

      <MarketingPageHeader
        eyebrow={COMMUNITY_COPY.sectionEyebrow}
        title={COMMUNITY_COPY.hubTitle}
        subtitle={COMMUNITY_COPY.hubSubtitle}
      />

      <div className="mx-auto mt-14 max-w-4xl space-y-16">
        <ConnectWithInterviewEra placement="community_hub" />

        {COMMUNITY_HUB_SECTIONS.map((section) => {
          const platforms = getHubPlatformsBySection(section.id);
          if (platforms.length === 0 && section.id !== 'tips') return null;

          return (
            <section key={section.id} aria-labelledby={`hub-section-${section.id}`}>
              <MarketingSectionHeader
                id={`hub-section-${section.id}`}
                title={section.title}
                subtitle={section.description}
                className="mb-6"
              />

              {section.id === 'tips' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {RESOURCE_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`p-4 ${IE_MARKETING_SURFACE_CARD_CLASS} hover:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))]`}
                      style={IE_MARKETING_SURFACE_CARD_STYLE}
                    >
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {item.description}
                      </p>
                    </Link>
                  ))}
                  {platforms.map((platform) => (
                    <CommunityCard
                      key={platform.id}
                      platform={platform}
                      placement="community_hub"
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {platforms.map((platform) => (
                    <CommunityCard
                      key={platform.id}
                      platform={platform}
                      placement="community_hub"
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <section aria-labelledby="hub-events-heading">
          <h2
            id="hub-events-heading"
            className="text-xl font-bold sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Upcoming events
          </h2>
          <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Live mock sessions, AMAs, and placement-season workshops — announced in our WhatsApp Channel first.
          </p>
          <p
            className="mt-4 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
              color: 'var(--text-secondary)',
            }}
          >
            No scheduled events right now. Follow the WhatsApp Channel above for the next announcement.
          </p>
        </section>

        <section aria-labelledby="hub-guidelines-heading">
          <h2
            id="hub-guidelines-heading"
            className="text-xl font-bold sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Community guidelines
          </h2>
          <ul className="mt-4 space-y-2" role="list">
            {COMMUNITY_GUIDELINES.map((rule) => (
              <li
                key={rule}
                className="flex gap-2 text-sm leading-relaxed sm:text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span aria-hidden style={{ color: 'var(--accent-primary)' }}>
                  •
                </span>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="hub-faq-heading">
          <h2
            id="hub-faq-heading"
            className="text-xl font-bold sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-3">
            {COMMUNITY_FAQ.map((item) => (
              <details
                key={item.q}
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <summary
                  className="cursor-pointer text-sm font-semibold sm:text-base"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </BlogMarketingShell>
  );
}
