import { faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { LANDING_FAQS } from '@/lib/landing/faq-content';

/** FAQPage JSON-LD kept in the initial HTML even when the FAQ UI is viewport-deferred. */
export function LandingFaqJsonLd() {
  const faqLd = faqPageJsonLd(LANDING_FAQS.map((f) => ({ question: f.q, answer: f.a })));
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
  );
}
