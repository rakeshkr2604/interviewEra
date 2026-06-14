import { describe, expect, it } from 'vitest';
import { toActivationApiBody, shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import type { ActivatePlanResult } from '@/lib/razorpay/activate-plan';

describe('activation-api-response', () => {
  it('maps fresh activation to API body', () => {
    const result: ActivatePlanResult = {
      activated: true,
      alreadyActivated: false,
      planExpiresAt: '2026-07-14T00:00:00.000Z',
      plan: 'starter',
    };
    const body = toActivationApiBody(result, 'starter');
    expect(body.ok).toBe(true);
    expect(body.activated).toBe(true);
    expect(body.alreadyActivated).toBe(false);
    expect(body.activationFailed).toBe(false);
    expect(shouldTrackPaymentCompleted(result)).toBe(true);
  });

  it('maps replay to API body', () => {
    const result: ActivatePlanResult = {
      activated: false,
      alreadyActivated: true,
      planExpiresAt: '2026-07-14T00:00:00.000Z',
      plan: 'starter',
    };
    const body = toActivationApiBody(result, 'starter');
    expect(body.ok).toBe(true);
    expect(body.alreadyActivated).toBe(true);
    expect(shouldTrackPaymentCompleted(result)).toBe(false);
  });

  it('maps failure to API body', () => {
    const result: ActivatePlanResult = {
      activated: false,
      alreadyActivated: false,
      activationFailed: true,
      error: 'conflict',
    };
    const body = toActivationApiBody(result, 'starter');
    expect(body.ok).toBe(false);
    expect(body.activationFailed).toBe(true);
  });
});
