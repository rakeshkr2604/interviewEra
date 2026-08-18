import { describe, expect, it } from 'vitest';
import {
  validateProviderPaymentAgainstLocalExpectation,
  type LocalPaymentExpectation,
  type ProviderOrderEntity,
  type ProviderPaymentEntity,
} from '@/lib/razorpay/provider-payment-validation';

function isFullListPrice(amountPaise: number): boolean {
  return amountPaise === 29900 || amountPaise === 79800 || amountPaise === 79900;
}

const expected = (amountPaise: number, plan: 'starter' | 'pro' = 'starter'): LocalPaymentExpectation => ({
  userId: 'user-1',
  plan,
  orderId: 'order-1',
  amountPaise,
  currency: 'INR',
  campaignRedemptionId: isFullListPrice(amountPaise) ? null : 'red-1',
});

const payment = (amount: number): ProviderPaymentEntity => ({
  id: 'pay-1',
  order_id: 'order-1',
  amount,
  currency: 'INR',
  status: 'captured',
});

const order = (amount: number, plan: 'starter' | 'pro'): ProviderOrderEntity => ({
  id: 'order-1',
  amount,
  currency: 'INR',
  status: 'paid',
  notes: {
    user_id: 'user-1',
    plan,
    ...(isFullListPrice(amount) ? {} : { campaign_redemption_id: 'red-1' }),
  },
});

describe('validateProviderPaymentAgainstLocalExpectation', () => {
  it.each([
    ['Starter full price', 29900, 'starter'],
    ['Pro full price (historical ₹798)', 79800, 'pro'],
    ['Pro full price (current ₹799)', 79900, 'pro'],
    ['Starter 30% campaign', 20900, 'starter'],
    ['Starter 50% campaign', 14900, 'starter'],
    ['Pro 30% campaign', 55900, 'pro'],
    ['Pro 50% campaign', 39900, 'pro'],
  ] as const)('accepts frozen %s amount', (_name, amount, plan) => {
    expect(
      validateProviderPaymentAgainstLocalExpectation(
        payment(amount),
        order(amount, plan),
        expected(amount, plan),
        'pay-1',
      ),
    ).toEqual({ ok: true });
  });

  it.each([
    ['lower payment amount', { amount: 20899 }, 'payment_amount_mismatch'],
    ['higher payment amount', { amount: 20901 }, 'payment_amount_mismatch'],
    ['USD payment', { currency: 'USD' }, 'payment_currency_mismatch'],
    ['EUR payment', { currency: 'EUR' }, 'payment_currency_mismatch'],
    ['empty payment currency', { currency: '' }, 'payment_currency_mismatch'],
    ['malformed payment currency', { currency: 'INR ' }, 'payment_currency_mismatch'],
    ['wrong payment ID', { id: 'pay-other' }, 'payment_id_mismatch'],
    ['wrong payment order', { order_id: 'order-other' }, 'payment_order_mismatch'],
    ['uncaptured payment', { status: 'authorized' }, 'payment_status_invalid'],
  ] as const)('rejects %s', (_name, patch, code) => {
    const result = validateProviderPaymentAgainstLocalExpectation(
      { ...payment(20900), ...patch },
      order(20900, 'starter'),
      expected(20900),
      'pay-1',
    );
    expect(result).toMatchObject({ ok: false, code });
  });

  it.each([
    ['wrong order ID', { id: 'order-other' }, 'order_id_mismatch'],
    ['wrong order amount', { amount: 20899 }, 'order_amount_mismatch'],
    ['USD order', { currency: 'USD' }, 'order_currency_mismatch'],
    ['empty order currency', { currency: '' }, 'order_currency_mismatch'],
    ['unpaid order', { status: 'attempted' }, 'order_status_invalid'],
    ['wrong order-note user', { notes: { user_id: 'user-other', plan: 'starter' } }, 'order_user_mismatch'],
    ['wrong order-note plan', { notes: { user_id: 'user-1', plan: 'pro' } }, 'order_plan_mismatch'],
  ] as const)('rejects %s', (_name, patch, code) => {
    const result = validateProviderPaymentAgainstLocalExpectation(
      payment(20900),
      { ...order(20900, 'starter'), ...patch },
      expected(20900),
      'pay-1',
    );
    expect(result).toMatchObject({ ok: false, code });
  });

  it('rejects a non-INR local expectation before trusting provider data', () => {
    expect(
      validateProviderPaymentAgainstLocalExpectation(
        payment(20900),
        order(20900, 'starter'),
        { ...expected(20900), currency: 'USD' },
        'pay-1',
      ),
    ).toMatchObject({ ok: false, code: 'order_currency_mismatch' });
  });

  it('rejects a missing or mismatched campaign redemption note', () => {
    const campaignOrder = order(20900, 'starter');

    for (const notes of [
      { user_id: 'user-1', plan: 'starter' },
      {
        ...campaignOrder.notes,
        campaign_redemption_id: 'red-other',
      },
    ]) {
      expect(
        validateProviderPaymentAgainstLocalExpectation(
          payment(20900),
          { ...campaignOrder, notes },
          expected(20900),
          'pay-1',
        ),
      ).toMatchObject({
        ok: false,
        code: 'order_campaign_redemption_mismatch',
      });
    }
  });

  it('rejects an unexpected campaign redemption note on a full-price order', () => {
    expect(
      validateProviderPaymentAgainstLocalExpectation(
        payment(29900),
        {
          ...order(29900, 'starter'),
          notes: {
            user_id: 'user-1',
            plan: 'starter',
            campaign_redemption_id: 'red-unexpected',
          },
        },
        expected(29900),
        'pay-1',
      ),
    ).toMatchObject({
      ok: false,
      code: 'order_campaign_redemption_mismatch',
    });
  });
});
