import { describe, expect, it } from 'vitest';
import {
  FREE_TIER_FEATURES,
  PRICING_COMPARISON,
  PRO_FEATURES,
  STARTER_FEATURES,
} from '@/lib/pricing/tiers';

describe('pricing entitlement truth', () => {
  it('shows universal production features across every plan', () => {
    for (const feature of [
      'Resume personalization',
      'Adaptive follow-ups',
      'Advanced scoring',
      'Progress tracking',
      'Post-interview report and email',
    ]) {
      const row = PRICING_COMPARISON.find((candidate) => candidate.feature === feature);
      expect(row, feature).toBeDefined();
      expect(row?.free).not.toBe('not_included');
      expect(row?.starter).not.toBe('not_included');
      expect(row?.pro).not.toBe('not_included');
    }
  });

  it('keeps verified Starter differentiation', () => {
    const copy = STARTER_FEATURES.join(' ');
    expect(copy).toMatch(/Full answer feedback/);
    expect(copy).toMatch(/Dimension notes and report synthesis/);
    expect(copy).toMatch(/30-day improvement roadmap/);
  });

  it('keeps verified Pro differentiation', () => {
    const copy = PRO_FEATURES.join(' ');
    expect(copy).toMatch(/Model-answer comparison/);
    expect(copy).toMatch(/PDF report export/);
  });

  it('does not advertise unverified or prohibited features', () => {
    const allCopy = [
      ...FREE_TIER_FEATURES.map((feature) => feature.text),
      ...STARTER_FEATURES,
      ...PRO_FEATURES,
    ].join(' ');
    expect(allCopy).not.toMatch(
      /keyword gap|premium preparation|priority support|resume review session|interview replay/i,
    );
  });
});
