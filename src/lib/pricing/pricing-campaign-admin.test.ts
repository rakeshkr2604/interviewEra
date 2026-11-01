import { describe, expect, it } from 'vitest';
import {
  canDeleteCampaign,
  deriveEffectiveStatus,
  findOverlappingActiveCampaign,
  generateCampaignSlug,
  slugifyCampaignName,
  validatePricingCampaignInput,
} from './pricing-campaign-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('pricing campaign admin validation', () => {
  it('accepts a 10% both-plan campaign', () => {
    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 10,
        applies_to_plans: [],
        starts_at: '2026-08-18T00:00:00.000Z',
        ends_at: '2026-08-20T00:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('rejects a 20% campaign that undercuts the ₹339 Starter floor', () => {
    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 20,
        applies_to_plans: [],
        starts_at: '2026-08-18T00:00:00.000Z',
        ends_at: '2026-08-20T00:00:00.000Z',
      }),
    ).toMatch(/cannot be below ₹339/);
  });

  it('rejects 51% and inverted windows', () => {
    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 51,
        applies_to_plans: ['starter'],
        starts_at: '2026-08-18T00:00:00.000Z',
        ends_at: '2026-08-20T00:00:00.000Z',
      }),
    ).toMatch(/0% and 50%/);

    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 20,
        applies_to_plans: ['pro'],
        starts_at: '2026-08-20T00:00:00.000Z',
        ends_at: '2026-08-18T00:00:00.000Z',
      }),
    ).toMatch(/after its start/);
  });

  it('slugifies campaign names', () => {
    expect(slugifyCampaignName('Limited Time Offer')).toBe('limited-time-offer');
  });

  it('generates non-colliding campaign slugs', () => {
    const slug1 = generateCampaignSlug('Weekend Offer');
    const slug2 = generateCampaignSlug('Weekend Offer');
    expect(slug1).toMatch(/^weekend-offer-[a-z0-9]+$/);
    expect(slug2).toMatch(/^weekend-offer-[a-z0-9]+$/);
    expect(slug1).not.toBe(slug2);
  });
});

describe('deriveEffectiveStatus', () => {
  const now = new Date('2026-09-01T12:00:00.000Z').getTime();

  it('identifies active campaign', () => {
    expect(
      deriveEffectiveStatus(
        {
          starts_at: '2026-09-01T00:00:00.000Z',
          ends_at: '2026-09-02T00:00:00.000Z',
          is_active: true,
        },
        now,
      ),
    ).toBe('active');
  });

  it('identifies scheduled future campaign', () => {
    expect(
      deriveEffectiveStatus(
        {
          starts_at: '2026-09-05T00:00:00.000Z',
          ends_at: '2026-09-07T00:00:00.000Z',
          is_active: true,
        },
        now,
      ),
    ).toBe('scheduled');
  });

  it('identifies ended campaign past its end date', () => {
    expect(
      deriveEffectiveStatus(
        {
          starts_at: '2026-08-20T00:00:00.000Z',
          ends_at: '2026-08-25T00:00:00.000Z',
          is_active: true,
        },
        now,
      ),
    ).toBe('ended');
  });

  it('preserves paused and archived states', () => {
    expect(
      deriveEffectiveStatus(
        {
          starts_at: '2026-09-01T00:00:00.000Z',
          ends_at: '2026-09-02T00:00:00.000Z',
          is_active: false,
          status: 'paused',
        },
        now,
      ),
    ).toBe('paused');

    expect(
      deriveEffectiveStatus(
        {
          starts_at: '2026-09-01T00:00:00.000Z',
          ends_at: '2026-09-02T00:00:00.000Z',
          is_active: false,
          status: 'archived',
        },
        now,
      ),
    ).toBe('archived');
  });
});

describe('findOverlappingActiveCampaign (plan-aware)', () => {
  it('allows parallel campaigns targeting different plans', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'existing-starter',
                    name: 'Starter Flash Sale',
                    slug: 'starter-flash-sale',
                    status: 'active',
                    is_active: true,
                    discount_type: 'percent',
                    discount_value: 20,
                    applies_to_plans: ['starter'],
                    starts_at: '2026-09-01T00:00:00.000Z',
                    ends_at: '2026-09-10T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // Candidate targets 'pro' only: should NOT overlap!
    const conflict = await findOverlappingActiveCampaign(mockSvc, {
      starts_at: '2026-09-02T00:00:00.000Z',
      ends_at: '2026-09-05T00:00:00.000Z',
      applies_to_plans: ['pro'],
    });

    expect(conflict).toBeNull();
  });

  it('detects conflict when candidate shares plans with an active campaign', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'existing-both',
                    name: 'Weekend Offer',
                    slug: 'weekend-offer',
                    status: 'active',
                    is_active: true,
                    discount_type: 'percent',
                    discount_value: 20,
                    applies_to_plans: ['starter', 'pro'],
                    starts_at: '2026-09-01T00:00:00.000Z',
                    ends_at: '2026-09-10T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // Candidate targets 'starter': overlaps on 'starter'!
    const conflict = await findOverlappingActiveCampaign(mockSvc, {
      starts_at: '2026-09-02T00:00:00.000Z',
      ends_at: '2026-09-05T00:00:00.000Z',
      applies_to_plans: ['starter'],
    });

    expect(conflict).not.toBeNull();
    expect(conflict?.name).toBe('Weekend Offer');
  });

  it('verifies boundary condition: no conflict when campaign A ends exactly when campaign B starts', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'existing-1',
                    name: 'Early Bird',
                    slug: 'early-bird',
                    status: 'active',
                    is_active: true,
                    discount_type: 'percent',
                    discount_value: 20,
                    applies_to_plans: ['starter'],
                    starts_at: '2026-09-01T00:00:00.000Z',
                    ends_at: '2026-09-05T12:00:00.000Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // Candidate starts exactly at existing end: 2026-09-05T12:00:00.000Z
    const conflict = await findOverlappingActiveCampaign(mockSvc, {
      starts_at: '2026-09-05T12:00:00.000Z',
      ends_at: '2026-09-10T00:00:00.000Z',
      applies_to_plans: ['starter'],
    });

    expect(conflict).toBeNull();
  });

  it('detects conflict on 1-second overlap across identical plans', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'existing-1',
                    name: 'Early Bird',
                    slug: 'early-bird',
                    status: 'active',
                    is_active: true,
                    discount_type: 'percent',
                    discount_value: 20,
                    applies_to_plans: ['pro'],
                    starts_at: '2026-09-01T00:00:00.000Z',
                    ends_at: '2026-09-05T12:00:00.000Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    // 1-second overlap: starts at 11:59:59Z while existing ends at 12:00:00Z
    const conflict = await findOverlappingActiveCampaign(mockSvc, {
      starts_at: '2026-09-05T11:59:59.000Z',
      ends_at: '2026-09-10T00:00:00.000Z',
      applies_to_plans: ['pro'],
    });

    expect(conflict).not.toBeNull();
  });
});

describe('canDeleteCampaign', () => {
  it('allows delete when payment count is 0', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 0, error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await canDeleteCampaign(mockSvc, 'test-camp-id');
    expect(res.canDelete).toBe(true);
    expect(res.paymentCount).toBe(0);
  });

  it('blocks delete when payments exist and suggests archive', async () => {
    const mockSvc = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 5, error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await canDeleteCampaign(mockSvc, 'test-camp-id');
    expect(res.canDelete).toBe(false);
    expect(res.paymentCount).toBe(5);
    expect(res.reason).toMatch(/5 payment transaction/);
  });

  it('blocks delete when marketing tracking links reference the campaign', async () => {
    const mockSvc = {
      from: (table: string) => ({
        select: () => ({
          eq: () =>
            Promise.resolve({
              count: table === 'marketing_tracking_links' ? 3 : 0,
              error: null,
            }),
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await canDeleteCampaign(mockSvc, 'test-camp-id');
    expect(res.canDelete).toBe(false);
    expect(res.trackingLinkCount).toBe(3);
    expect(res.reason).toMatch(/3 marketing tracking link/);
  });

  it('blocks delete when continued child campaign instances exist', async () => {
    const mockSvc = {
      from: (table: string) => ({
        select: () => ({
          eq: () =>
            Promise.resolve({
              count: table === 'pricing_campaigns' ? 2 : 0,
              error: null,
            }),
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await canDeleteCampaign(mockSvc, 'test-camp-id');
    expect(res.canDelete).toBe(false);
    expect(res.childCampaignCount).toBe(2);
    expect(res.reason).toMatch(/2 continued campaign instance/);
  });
});
