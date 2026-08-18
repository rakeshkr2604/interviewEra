import { LandingFaqCategorized } from '@/components/landing/faq/LandingFaqCategorized';
import { PRICING_FAQ_CATEGORIES } from '@/lib/landing/home-content';
import '@/components/landing/faq/LandingFaq.css';

export function PricingFaq() {
  return (
    <section
      className="border-t px-4 py-12 sm:px-6 sm:py-16"
      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      aria-labelledby="pricing-faq-heading"
    >
      <div className="mx-auto max-w-6xl">
        <LandingFaqCategorized
          categories={PRICING_FAQ_CATEGORIES}
          heading={
            <h2
              id="pricing-faq-heading"
              className="landing-faq-title font-[family-name:var(--font-bricolage)] text-[var(--text-primary)]"
            >
              <span className="landing-faq-title__line">Frequently Asked</span>
              <span className="landing-faq-title__line">Questions</span>
            </h2>
          }
        />
      </div>
    </section>
  );
}
