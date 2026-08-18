import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANDING_FAQ_REGISTRY } from '@/lib/landing/faq-content';
import { PRICING_FAQ_CATEGORIES } from '@/lib/landing/home-content';
import { renewConfirmBody } from '@/lib/pricing/copy';

describe('P0.2 customer-facing copy consistency', () => {
  it('landing FAQ uses session-start credit truth', () => {
    const credits = LANDING_FAQ_REGISTRY.credits.a;
    expect(credits).toMatch(/starts one mock interview session/i);
    expect(credits).not.toMatch(/one complete mock/i);
    expect(credits).not.toMatch(/wait until you have credits/i);
  });

  it('pricing FAQ renewal describes additive credits', () => {
    const plans = PRICING_FAQ_CATEGORIES.find((category) => category.id === 'plans');
    const renew = plans?.items.find((item) => item.q === 'Can I renew after my plan expires?');
    expect(renew?.a).toMatch(/adds the new plan's credits to your remaining balance/i);
    expect(renew?.a).not.toMatch(/refresh/i);
  });

  it('renew confirm dialog copy is additive, not refresh', () => {
    const body = renewConfirmBody('2026-09-15T00:00:00.000Z');
    expect(body).toMatch(/adds the new plan's credits to your remaining balance/i);
    expect(body).not.toMatch(/refresh/i);
  });

  it('public pricing page does not claim one credit equals a complete interview', () => {
    const pricingPage = readFileSync(
      join(process.cwd(), 'src/app/(marketing)/pricing/PricingPageClient.tsx'),
      'utf8',
    );
    expect(pricingPage).toMatch(/starts one mock interview session/i);
    expect(pricingPage).not.toMatch(/1 full mock interview/i);
    expect(pricingPage).not.toMatch(/one complete mock/i);
  });

  it('help page reflects Starter vs Pro report entitlements', () => {
    const helpPage = readFileSync(
      join(process.cwd(), 'src/app/(marketing)/help/page.tsx'),
      'utf8',
    );
    expect(helpPage).toMatch(/Starter unlocks detailed feedback/i);
    expect(helpPage).toMatch(/Pro adds model-answer comparison/i);
    expect(helpPage).not.toMatch(/blurred on Free and Starter plans/i);
  });
});
