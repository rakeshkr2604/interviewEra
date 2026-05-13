import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { HOME_MONEY_PAGE_LINKS } from '@/lib/seo/internal-links';

/** Above-the-fold-adjacent crawl paths on the marketing homepage. */
export function HomeMoneyPageLinks() {
  return (
    <SeoCrossLinksSection
      heading="Explore InterviewEra"
      links={HOME_MONEY_PAGE_LINKS}
      footer={
        <>
          Structured mock interviews for Indian campus hiring —{' '}
          <a href="/signup" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--accent-primary)' }}>
            create a free account
          </a>
          .
        </>
      }
    />
  );
}
