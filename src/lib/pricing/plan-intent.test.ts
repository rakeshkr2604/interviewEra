import { describe, expect, it } from 'vitest';
import {
  buildSignupIntentHref,
  buildUpgradeIntentPath,
  normalizePricingCampaignCode,
  parseUpgradeIntent,
} from '@/lib/pricing/plan-intent';

describe('pricing plan intent', () => {
  it('preserves plan and normalized campaign code through signup', () => {
    const href = buildSignupIntentHref('starter', ' launch30 ');
    const signup = new URL(href, 'https://interviewera.com');
    const next = signup.searchParams.get('next');

    expect(next).toBe('/upgrade?plan=starter&code=LAUNCH30');
    expect(parseUpgradeIntent(next)).toEqual({ plan: 'starter', code: 'LAUNCH30' });
  });

  it('preserves plan without trusting or carrying a price', () => {
    const next = buildUpgradeIntentPath('pro');
    expect(next).toBe('/upgrade?plan=pro');
    expect(next).not.toMatch(/amount|price|discount/i);
  });

  it('rejects unsafe campaign codes and non-upgrade redirects', () => {
    expect(normalizePricingCampaignCode('bad code!')).toBeUndefined();
    expect(parseUpgradeIntent('//evil.example/upgrade?plan=pro')).toEqual({});
    expect(parseUpgradeIntent('/dashboard?plan=pro')).toEqual({});
  });

  it('ignores invalid plan identities', () => {
    expect(parseUpgradeIntent('/upgrade?plan=enterprise&code=SAVE')).toEqual({ code: 'SAVE' });
  });
});
