import { describe, expect, it } from 'vitest';
import { PRICING_FAQ, PRICING_FAQ_CATEGORIES } from '@/lib/landing/home-content';

describe('pricing FAQ content', () => {
  it('keeps four FAQs in every category', () => {
    expect(PRICING_FAQ_CATEGORIES).toHaveLength(4);
    for (const category of PRICING_FAQ_CATEGORIES) {
      expect(category.items, category.label).toHaveLength(4);
    }
  });

  it('keeps visible categories and FAQPage schema content in sync', () => {
    const categorized = PRICING_FAQ_CATEGORIES.flatMap((category) => category.items);
    expect(PRICING_FAQ).toEqual(categorized);
    expect(new Set(PRICING_FAQ.map((item) => item.q)).size).toBe(PRICING_FAQ.length);
  });

  it('documents additive renewal credits in plans FAQ', () => {
    const plans = PRICING_FAQ_CATEGORIES.find((category) => category.id === 'plans');
    const renew = plans?.items.find((item) => item.q === 'Can I renew after my plan expires?');
    expect(renew?.a).toContain("adds the new plan's credits to your remaining balance");
  });
});
