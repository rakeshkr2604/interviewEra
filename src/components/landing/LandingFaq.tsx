import Link from 'next/link';
import { faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { LANDING_FAQ_CATEGORY_VIEWS, LANDING_FAQS } from '@/lib/landing/faq-content';
import { LandingFaqCategorized } from '@/components/landing/faq/LandingFaqCategorized';
import { LANDING_HOME_SECTION, LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import '@/components/landing/faq/LandingFaq.css';

/**
 * Homepage FAQ — categorized accordion (TUF-inspired) + FAQPage JSON-LD.
 * Copy lives in `faq-content.ts`; interactive shell is a client island.
 */
export function LandingFaq() {
  const faqLd = faqPageJsonLd(LANDING_FAQS.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'ie-lh-section-faq border-t')}
      aria-labelledby="home-faq-heading"
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'max-w-6xl')}>
        <LandingFaqCategorized
          categories={LANDING_FAQ_CATEGORY_VIEWS}
          heading={
            <>
              <h2
                id="home-faq-heading"
                className="landing-faq-title font-[family-name:var(--font-bricolage)] text-[var(--text-primary)]"
              >
                <span className="landing-faq-title__line">Frequently Asked</span>
                <span className="landing-faq-title__line">Questions</span>
              </h2>
            </>
          }
        />

        <div className="ie-lh-faq-footer mt-10 rounded-2xl border px-5 py-4 text-center text-sm sm:px-6">
          Still have questions?{' '}
          <Link
            href="/help-center"
            className="ie-lh-text-accent ie-lh-inline-link-focus font-semibold underline-offset-2 hover:underline"
          >
            Help Center
          </Link>
          ,{' '}
          <Link
            href="/how-it-works"
            className="ie-lh-text-accent ie-lh-inline-link-focus font-semibold underline-offset-2 hover:underline"
          >
            how it works
          </Link>
          , or{' '}
          <Link
            href={COMMUNITY_HUB_PATH}
            className="ie-lh-text-accent ie-lh-inline-link-focus font-semibold underline-offset-2 hover:underline"
          >
            community
          </Link>
          .
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}
