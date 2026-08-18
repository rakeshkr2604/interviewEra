/**
 * Validates Razorpay's payment and order entities against a frozen local
 * checkout expectation. This is intentionally separate from DB lookups and
 * activation: callers supply only provider data plus server-derived values.
 */

import type { PaidPlanId } from '@/lib/pricing/plans';

export type ProviderPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

export type ProviderOrderEntity = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
};

export type LocalPaymentExpectation = {
  userId: string;
  plan: PaidPlanId;
  orderId: string;
  amountPaise: number;
  currency: string;
  campaignRedemptionId: string | null;
};

export type ProviderPaymentValidationFailure =
  | 'payment_id_mismatch'
  | 'payment_order_mismatch'
  | 'payment_amount_mismatch'
  | 'payment_currency_mismatch'
  | 'payment_status_invalid'
  | 'order_id_mismatch'
  | 'order_amount_mismatch'
  | 'order_currency_mismatch'
  | 'order_status_invalid'
  | 'order_user_mismatch'
  | 'order_plan_mismatch'
  | 'order_campaign_redemption_mismatch';

export type ProviderPaymentValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: ProviderPaymentValidationFailure;
      expected?: string | number;
      actual?: string | number;
    };

const REQUIRED_CURRENCY = 'INR';
const CAPTURED_PAYMENT_STATUS = 'captured';
const PAID_ORDER_STATUS = 'paid';

/**
 * Successful Razorpay checkout semantics in this integration are a captured
 * payment for a paid order, both in INR. Do not relax this to local status:
 * `payments.status` is an audit/completion artifact, never provider proof.
 */
export function validateProviderPaymentAgainstLocalExpectation(
  payment: ProviderPaymentEntity,
  order: ProviderOrderEntity,
  expected: LocalPaymentExpectation,
  expectedPaymentId: string,
): ProviderPaymentValidationResult {
  if (expected.currency !== REQUIRED_CURRENCY) {
    return {
      ok: false,
      code: 'order_currency_mismatch',
      expected: REQUIRED_CURRENCY,
      actual: expected.currency,
    };
  }

  if (payment.id !== expectedPaymentId) {
    return { ok: false, code: 'payment_id_mismatch', expected: expectedPaymentId, actual: payment.id };
  }
  if (payment.order_id !== expected.orderId) {
    return {
      ok: false,
      code: 'payment_order_mismatch',
      expected: expected.orderId,
      actual: payment.order_id,
    };
  }
  if (payment.amount !== expected.amountPaise) {
    return {
      ok: false,
      code: 'payment_amount_mismatch',
      expected: expected.amountPaise,
      actual: payment.amount,
    };
  }
  if (payment.currency !== REQUIRED_CURRENCY || payment.currency !== expected.currency) {
    return {
      ok: false,
      code: 'payment_currency_mismatch',
      expected: expected.currency,
      actual: payment.currency,
    };
  }
  if (payment.status !== CAPTURED_PAYMENT_STATUS) {
    return {
      ok: false,
      code: 'payment_status_invalid',
      expected: CAPTURED_PAYMENT_STATUS,
      actual: payment.status,
    };
  }

  if (order.id !== expected.orderId) {
    return { ok: false, code: 'order_id_mismatch', expected: expected.orderId, actual: order.id };
  }
  if (order.amount !== expected.amountPaise) {
    return {
      ok: false,
      code: 'order_amount_mismatch',
      expected: expected.amountPaise,
      actual: order.amount,
    };
  }
  if (order.currency !== REQUIRED_CURRENCY || order.currency !== expected.currency) {
    return {
      ok: false,
      code: 'order_currency_mismatch',
      expected: expected.currency,
      actual: order.currency,
    };
  }
  if (order.status !== PAID_ORDER_STATUS) {
    return {
      ok: false,
      code: 'order_status_invalid',
      expected: PAID_ORDER_STATUS,
      actual: order.status,
    };
  }
  if (order.notes?.['user_id'] !== expected.userId) {
    return {
      ok: false,
      code: 'order_user_mismatch',
      expected: expected.userId,
      actual: order.notes?.['user_id'] ?? '',
    };
  }
  if (order.notes?.['plan'] !== expected.plan) {
    return {
      ok: false,
      code: 'order_plan_mismatch',
      expected: expected.plan,
      actual: order.notes?.['plan'] ?? '',
    };
  }
  const providerCampaignRedemptionId =
    order.notes?.['campaign_redemption_id'] ?? null;
  if (providerCampaignRedemptionId !== expected.campaignRedemptionId) {
    return {
      ok: false,
      code: 'order_campaign_redemption_mismatch',
      expected: expected.campaignRedemptionId ?? '',
      actual: providerCampaignRedemptionId ?? '',
    };
  }

  return { ok: true };
}
