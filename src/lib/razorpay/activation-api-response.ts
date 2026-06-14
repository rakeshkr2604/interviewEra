import type { ActivatePlanResult, ActivatePlanParams } from '@/lib/razorpay/activate-plan';
import { activationSucceeded, activationWasFresh } from '@/lib/razorpay/activate-plan';

/** Maps internal activation result to a consistent HTTP JSON body. */
export function toActivationApiBody(result: ActivatePlanResult, plan: ActivatePlanParams['plan']) {
  if (!activationSucceeded(result)) {
    return {
      ok: false as const,
      activated: false as const,
      alreadyActivated: false as const,
      activationFailed: true as const,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    activated: result.activated,
    alreadyActivated: result.alreadyActivated,
    activationFailed: false as const,
    plan: result.plan ?? plan,
    planExpiresAt: result.planExpiresAt,
  };
}

export function shouldTrackPaymentCompleted(result: ActivatePlanResult): boolean {
  return activationWasFresh(result);
}
