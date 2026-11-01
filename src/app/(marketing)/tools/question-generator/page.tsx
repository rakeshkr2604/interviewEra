import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Zap, ShieldCheck, ListChecks } from 'lucide-react';
import { generateMetadata, brandPageTitle, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { webApplicationJsonLd, breadcrumbListJsonLd, faqPageJsonLd, howToJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { QuestionGeneratorForm } from './QuestionGeneratorForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';
import {
  QGEN_FAQ_ITEMS,
  QuestionGeneratorSeoSections,
} from './QuestionGeneratorSeoSections';

// generateQuestionsAction inherits this segment config: worst case is two
// validation attempts × 22s registry deadline, which overflows the default.
export const maxDuration = 60;

const QGEN_OG_TITLE = 'Free Interview Question Generator';

export const metadata: Metadata = generateMetadata({
  title: QGEN_OG_TITLE,
  description:
    'Free interview question generator — get 10 random or role-specific questions in 10 seconds. Technical, behavioral, and HR prompts. Free with a registered InterviewEra account.',
  path: '/tools/question-generator',
  socialTitle: brandPageTitle(QGEN_OG_TITLE),
  keywords: [
    'interview question generator',
    'interview questions generator',
    'random interview question generator',
    'free interview questions',
    'placement interview questions',
    'technical interview questions',
    'HR interview questions',
    'mock interview preparation',
  ],
});

const ORIGIN = getCanonicalSiteOrigin();

const QGEN_WEBAPP_LD = webApplicationJsonLd({
  name: 'Free Interview Question Generator',
  description:
    'Generate 10 role-specific interview questions in seconds. Tailored by role, experience level, and domain — free with a registered InterviewEra account.',
  url: canonicalUrl('/tools/question-generator'),
  providerId: schemaIds.organization,
});

const QGEN_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools/question-generator' },
    { name: 'Interview Question Generator', path: '/tools/question-generator' },
  ],
  ORIGIN,
);

const QGEN_FAQ_LD = faqPageJsonLd([...QGEN_FAQ_ITEMS]);

const QGEN_HOWTO_LD = howToJsonLd(
  'How to use the free interview question generator',
  'Generate random or role-specific interview questions in seconds — free with a registered InterviewEra account.',
  [
    {
      name: 'Pick your role',
      text: 'Enter a job title or choose from popular roles like Software Engineer or Android Developer.',
    },
    {
      name: 'Set experience and domain',
      text: 'Optional filters sharpen technical vs behavioral mix for your target interview.',
    },
    {
      name: 'Generate 10 questions',
      text: 'Get a fresh set of interview questions in under 10 seconds.',
    },
    {
      name: 'Practise your answers',
      text: 'Work through each question aloud using STAR for behavioral prompts.',
    },
  ],
);

const BULLETS = [
  {
    icon: Zap,
    title: 'Under 10 seconds',
    body: 'Ten tailored questions per run, tuned to your role and seniority.',
  },
  {
    icon: ListChecks,
    title: 'Mix of categories',
    body: 'Technical, behavioral, and situational prompts like real interviews.',
  },
  {
    icon: ShieldCheck,
    title: 'Free with your account',
    body: 'Create a free account and try the tool instantly. Upgrade when you want AI mock practice.',
  },
] as const;

export default function QuestionGeneratorPage() {
  return (
    <>
      <JsonLdScript id="qgen-webapp-ld" data={QGEN_WEBAPP_LD} />
      <JsonLdScript id="qgen-breadcrumb-ld" data={QGEN_BREADCRUMB_LD} />
      <JsonLdScript id="qgen-faq-ld" data={QGEN_FAQ_LD} />
      <JsonLdScript id="qgen-howto-ld" data={QGEN_HOWTO_LD} />
      <FreeToolPageLayout
        eyebrow="Free tool · free account"
        eyebrowIcon={Sparkles}
        title="Free Interview Question Generator"
        description="Generate random or role-specific interview questions in seconds — tailored by role, experience level, and domain. Free with a registered InterviewEra account."
        bullets={BULLETS}
        footerSlot={
          <p
            className="mx-auto max-w-md text-sm text-left lg:mx-0"
            style={{ color: 'var(--text-muted)' }}
          >
            Also try:{' '}
            <Link
              href="/tools/ats-checker"
              className="font-medium underline-offset-4 transition-colors hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              ATS resume checker
            </Link>
            {' · '}
            <Link
              href="/tools/star-builder"
              className="font-medium underline-offset-4 transition-colors hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              STAR answer builder
            </Link>
          </p>
        }
      >
        <QuestionGeneratorForm />
      </FreeToolPageLayout>
      <QuestionGeneratorSeoSections />
    </>
  );
}
