import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, Shield, Sparkles } from 'lucide-react';
import { generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { webApplicationJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { StarBuilderForm } from './StarBuilderForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { buildStarBuilderLandingLinks } from '@/lib/seo/internal-linking';

export const metadata: Metadata = generateMetadata({
  title: 'STAR answer builder',
  description:
    'Structure your behavioral interview answers using the STAR method. Get a polished, ready-to-use answer with quality scores and improvement tips. Free with a registered InterviewEra account.',
  path: '/tools/star-builder',
  keywords: [
    'STAR method examples',
    'behavioral interview answers',
    'STAR method interview',
    'how to answer behavioral questions',
    'STAR method template',
    'interview answer builder',
  ],
});

const ORIGIN = getCanonicalSiteOrigin();

const STAR_WEBAPP_LD = webApplicationJsonLd({
  name: 'STAR Answer Builder',
  description:
    'Structure behavioral interview answers using the STAR method. Get a polished, scored answer with improvement tips — free with a registered InterviewEra account.',
  url: canonicalUrl('/tools/star-builder'),
  providerId: schemaIds.organization,
});

const STAR_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools/star-builder' },
    { name: 'STAR Answer Builder', path: '/tools/star-builder' },
  ],
  ORIGIN,
);

const BULLETS = [
  {
    icon: ClipboardCheck,
    title: 'Interview-ready wording',
    body: 'Turn rough bullets into a tight story recruiters and panels can follow in one listen.',
  },
  {
    icon: BookOpen,
    title: 'Scores + fixes',
    body: 'See structure, specificity, and impact scores with concrete next steps — not generic advice.',
  },
  {
    icon: Shield,
    title: 'Private & free',
    body: 'Free with a registered InterviewEra account. Your draft is used only to generate this response — not stored as a profile.',
  },
] as const;

const STAR_LEGEND = [
  { letter: 'S', label: 'Situation', border: 'hsla(199, 89%, 48%, 0.45)', fill: 'hsla(199, 89%, 48%, 0.14)' },
  { letter: 'T', label: 'Task', border: 'hsla(271, 81%, 56%, 0.45)', fill: 'hsla(271, 81%, 56%, 0.14)' },
  { letter: 'A', label: 'Action', border: 'hsla(24, 95%, 53%, 0.45)', fill: 'hsla(24, 95%, 53%, 0.14)' },
  { letter: 'R', label: 'Result', border: 'hsla(152, 69%, 40%, 0.45)', fill: 'hsla(152, 69%, 40%, 0.14)' },
] as const;

export default function StarBuilderPage() {
  const starTopicSections = buildStarBuilderLandingLinks();

  return (
    <>
      <JsonLdScript id="star-webapp-ld" data={STAR_WEBAPP_LD} />
      <JsonLdScript id="star-breadcrumb-ld" data={STAR_BREADCRUMB_LD} />
      <FreeToolPageLayout
      eyebrow="Free tool · free account"
      eyebrowIcon={Sparkles}
      title="STAR method answer builder"
      description="Turn your Situation → Task → Action → Result notes into a confident spoken answer, with scores and fixes — about two minutes, with a free account."
      bullets={BULLETS}
      leftSlot={
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:mx-0 lg:max-w-none">
          {STAR_LEGEND.map(({ letter, label, border, fill }) => (
            <div
              key={letter}
              className="rounded-xl border px-2 py-3 text-center transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: border,
                background: fill,
              }}
            >
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {letter}
              </p>
              <p className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      }
      footerSlot={
        <p
          className="mx-auto max-w-md text-sm text-left lg:mx-0"
          style={{ color: 'var(--text-muted)' }}
        >
          Next:{' '}
          <Link
            href="/tools/question-generator"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Interview question generator
          </Link>
          {' · '}
          <Link
            href="/blog/what-is-star-method-with-examples"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            STAR method guide
          </Link>
        </p>
      }
    >
      <StarBuilderForm />
    </FreeToolPageLayout>
      {starTopicSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  );
}
