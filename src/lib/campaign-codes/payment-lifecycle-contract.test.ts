import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

const checkoutButton = source('src', 'components', 'pricing', 'CheckoutButton.tsx');
const webhookRoute = source('src', 'app', 'api', 'payments', 'webhook', 'route.ts');
const createOrderRoute = source('src', 'app', 'api', 'payments', 'create-order', 'route.ts');

describe('campaign payment lifecycle source contracts', () => {
  it('client dismissal and payment.failed never release a bound reservation', () => {
    expect(checkoutButton).not.toContain('/api/payments/release-campaign-reservation');
    expect(checkoutButton).not.toContain('releaseReservationBestEffort');
    expect(checkoutButton).toMatch(/ondismiss:[\s\S]+PAYMENT_CANCELLED_MESSAGE/);
    expect(checkoutButton).toMatch(/rzp\.on\('payment\.failed'[\s\S]+toast\.error/);
  });

  it('payment.failed webhook retains the bound reservation', () => {
    const failedBranch = webhookRoute.match(
      /if \(event\.event === 'payment\.failed'\)([\s\S]+?)paymentLog\('webhook', 'ignored_event'/,
    );
    expect(failedBranch).not.toBeNull();
    expect(failedBranch![1]).not.toContain('releaseCampaignReservation');
    expect(failedBranch![1]).toContain("reason: 'bound_order_may_still_be_paid'");
  });

  it('campaign order creation uses atomic attachment and exact unbound cleanup', () => {
    expect(createOrderRoute).toContain('attachCampaignOrder(service');
    expect(createOrderRoute).not.toContain(".from('campaign_code_redemptions').update");
    expect(createOrderRoute).toMatch(
      /if \(redemptionId && ownsNewReservation\)[\s\S]+releaseCampaignReservation/,
    );
  });
});
