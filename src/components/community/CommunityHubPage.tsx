import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { CommunityCard } from '@/components/community/CommunityCard';
import { CommunityPageTracker } from '@/components/community/CommunityPageTracker';
import { ConnectWithInterviewEra } from '@/components/community/ConnectWithInterviewEra';
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

      <header className="mx-auto max-w-3xl text-center">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--accent-hover)' }}
        >
          {COMMUNITY_COPY.sectionEyebrow}
        </span>
        <h1
          className="mt-3 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-tight tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {COMMUNITY_COPY.hubTitle}
        </h1>
        <p
          className="mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          {COMMUNITY_COPY.hubSubtitle}
        </p>
      </header>

      <div className="mx-auto mt-14 max-w-4xl space-y-16">
        <ConnectWithInterviewEra placement="community_hub" />

        {COMMUNITY_HUB_SECTIONS.map((section) => {
          const platforms = getHubPlatformsBySection(section.id);
          if (platforms.length === 0 && section.id !== 'tips') return null;

          return (
            <section key={section.id} aria-labelledby={`hub-section-${section.id}`}>
              <div className="mb-6">
                <h2
                  id={`hub-section-${section.id}`}
                  className="text-xl font-bold sm:text-2xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {section.title}
                </h2>
                <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                  {section.description}
                </p>
              </div>

              {section.id === 'tips' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {RESOURCE_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))]"
                      style={{
                        borderColor: 'var(--card-border)',
                        background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                      }}
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
