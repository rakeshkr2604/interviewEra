import { describe, expect, it } from 'vitest';
import { PRICING_FAQ, PRICING_FAQ_CATEGORIES } from '@/lib/landing/home-content';
import { FREE_PLAN } from '@/lib/pricing/plans';

describe('pricing FAQ content', () => {
  it('keeps five categories with four or five FAQs each', () => {
    expect(PRICING_FAQ_CATEGORIES.map((category) => category.id)).toEqual([
      'tools',
      'credits',
      'plans',
      'payments',
      'support',
    ]);
    for (const category of PRICING_FAQ_CATEGORIES) {
      expect(category.items.length, category.label).toBeGreaterThanOrEqual(4);
      expect(category.items.length, category.label).toBeLessThanOrEqual(5);
    }
  });

  it('keeps visible categories and FAQPage schema content in sync', () => {
    const categorized = PRICING_FAQ_CATEGORIES.flatMap((category) => category.items);
    expect(PRICING_FAQ).toEqual(categorized);
    expect(new Set(PRICING_FAQ.map((item) => item.q)).size).toBe(PRICING_FAQ.length);
  });

  it('answers every launch-required pricing question', () => {
    const questions = PRICING_FAQ.map((item) => item.q);
    for (const required of [
      'Are the preparation tools free?',
      'Do free tools consume interview credits?',
      'How many mock-interview credits are included?',
      'How long does Starter or Pro access last?',
      'Are payments recurring?',
      'What happens when my credits run out?',
      'What happens when I reach a fair-use limit?',
      'How does the launch offer work?',
      'When will DSA preparation become available?',
    ]) {
      expect(questions, required).toContain(required);
    }
  });

  it('states credit truth: tools are credit-free, new Free accounts get the canonical grant', () => {
    const byQ = new Map(PRICING_FAQ.map((item) => [item.q, item.a]));
    expect(byQ.get('Do free tools consume interview credits?')).toMatch(/never deducts/i);
    expect(byQ.get('How many mock-interview credits are included?')).toContain(
      `${FREE_PLAN.credits} lifetime credits`,
    );
    expect(byQ.get('When will DSA preparation become available?')).toMatch(/not available yet/i);
    expect(PRICING_FAQ.map((item) => item.a).join(' ')).not.toMatch(/\b3 (free |interview )?credits\b/i);
  });

  it('documents additive renewal credits in plans FAQ', () => {
    const plans = PRICING_FAQ_CATEGORIES.find((category) => category.id === 'plans');
    const renew = plans?.items.find((item) => item.q === 'Can I renew after my plan expires?');
    expect(renew?.a).toContain("adds the new plan's credits to your remaining balance");
  });
});
