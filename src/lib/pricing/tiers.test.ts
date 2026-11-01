import { describe, expect, it } from 'vitest';
import {
  FREE_TIER_FEATURES,
  PRICING_COMPARISON,
  PRICING_COMPARISON_GROUPS,
  PRO_FEATURES,
  STARTER_FEATURES,
} from '@/lib/pricing/tiers';
import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';
import { buildFairUseComparisonGroup } from '@/lib/pricing/fair-use';
import { FREE_TIER_TOOL_LIMITS } from '@/lib/security/free-tool-rate-limit';

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

  it('marks every preparation tool as credit-free on all plans', () => {
    const tools = PRICING_COMPARISON_GROUPS.find((group) => group.id === 'tools');
    expect(tools?.rows).toHaveLength(4);
    expect(tools?.note).toMatch(/never consumes mock-interview credits/i);
    for (const row of tools?.rows ?? []) {
      expect([row.free, row.starter, row.pro]).toEqual(['included', 'included', 'included']);
    }
    const usage = PRICING_COMPARISON.find((row) => row.feature === 'Credits used by preparation tools');
    expect([usage?.free, usage?.starter, usage?.pro]).toEqual(['None', 'None', 'None']);
  });

  it('derives credit counts from the canonical plan config', () => {
    const row = PRICING_COMPARISON.find((candidate) => candidate.feature === 'Interview credits');
    expect(row?.free).toContain(String(FREE_PLAN.credits));
    expect(row?.starter).toBe(String(PAID_PLANS.starter.credits));
    expect(row?.pro).toBe(String(PAID_PLANS.pro.credits));
  });

  it('builds fair-use rows from the live limiter policy', () => {
    const group = buildFairUseComparisonGroup();
    const ats = group.rows.find((row) => row.feature === 'ATS Resume Checker');
    expect(ats?.free).toBe(
      `${FREE_TIER_TOOL_LIMITS['ats-checker'].hourly}/hour · ${FREE_TIER_TOOL_LIMITS['ats-checker'].daily}/day`,
    );
    expect(group.rows).toHaveLength(5);
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
