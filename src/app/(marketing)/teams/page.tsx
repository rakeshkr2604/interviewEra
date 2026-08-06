import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { HiringTeamsLandingClient } from '@/components/landing/hiring/HiringTeamsLandingClient';
import { HIRING_FAQ, HIRING_META } from '@/lib/landing/hiring-content';
import { generateMetadata } from '@/lib/seo/metadata';
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';

export const metadata = generateMetadata({
  title: HIRING_META.title,
  description: HIRING_META.description,
  path: '/teams',
  keywords:
    'AI candidate evaluation, hiring team dashboard, structured interview scoring, recruiter pipeline, HR interview platform',
});

const ORIGIN = getCanonicalSiteOrigin();

const TEAMS_FAQ_LD = faqPageJsonLd(HIRING_FAQ.map((item) => ({ question: item.q, answer: item.a })));

const TEAMS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Hiring Teams', path: '/teams' },
  ],
  ORIGIN,
);

export default function TeamsPage() {
  return (
    <>
      <JsonLdScript id="teams-faq-ld" data={TEAMS_FAQ_LD} />
      <JsonLdScript id="teams-breadcrumb-ld" data={TEAMS_BREADCRUMB_LD} />
      <main id="main-content">
        <HiringTeamsLandingClient />
      </main>
    </>
  );
}
