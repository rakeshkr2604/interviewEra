import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { generateMetadata } from '@/lib/seo/metadata';
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { TeamsPageContent } from './TeamsPageContent';
import { cn } from '@/lib/utils';

export const metadata = generateMetadata({
  title: 'For Teams',
  description: 'InterviewEra for hiring teams and campus placement programs.',
  path: '/teams',
});

const ORIGIN = getCanonicalSiteOrigin();

const TEAMS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'For Teams', path: '/teams' },
  ],
  ORIGIN,
);

export default function TeamsPage() {
  return (
    <>
      <JsonLdScript id="teams-breadcrumb-ld" data={TEAMS_BREADCRUMB_LD} />
      <main id="main-content" className={cn(LANDING_PAGE_CONTAINER, 'px-4 sm:px-5')}>
        <TeamsPageContent />
      </main>
    </>
  );
}
