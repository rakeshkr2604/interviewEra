import { describe, expect, it } from 'vitest';
import {
  PAYMENT_TRUST_BULLETS,
  UPGRADE_PAGE_FOOTER,
  checkoutOrderDescription,
  planPriceLine,
} from './copy';
import { PAID_PLANS } from './plans';

describe('pricing copy — launch tax honesty', () => {
  it('uses neutral INR checkout language without GST-inclusive claims', () => {
    const bullets = PAYMENT_TRUST_BULLETS.join(' ');
    expect(bullets).toMatch(/Prices are displayed in INR/i);
    expect(bullets).toMatch(/total amount payable is shown before you complete checkout/i);
    expect(bullets.toLowerCase()).not.toContain('gst');
    expect(UPGRADE_PAGE_FOOTER.toLowerCase()).not.toContain('gst');
    expect(UPGRADE_PAGE_FOOTER).toMatch(/No auto-renewal/i);
  });

  it('keeps one-time and no-auto-renewal disclosures', () => {
    expect(PAYMENT_TRUST_BULLETS).toContain('One-time payment');
    expect(PAYMENT_TRUST_BULLETS).toContain('No auto-renewal');
  });

  it('aligns displayed plan INR with canonical paise amounts', () => {
    for (const plan of Object.values(PAID_PLANS)) {
      expect(plan.amountPaise).toBe(plan.amountInr * 100);
      expect(planPriceLine(plan.id)).toBe(`₹${plan.amountInr}`);
      expect(checkoutOrderDescription(plan.id)).toContain(`₹${plan.amountInr}`);
    }
  });

  it('does not invent a GSTIN in payment trust copy', () => {
    expect(PAYMENT_TRUST_BULLETS.join(' ')).not.toMatch(/GSTIN|CIN\b/i);
    expect(UPGRADE_PAGE_FOOTER).not.toMatch(/GSTIN|CIN\b/i);
  });
});
