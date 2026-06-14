import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { verifyOrderPaymentSignature } from '@/lib/razorpay/payment-signature';

describe('verifyOrderPaymentSignature', () => {
  const secret = 'test_webhook_secret_for_hmac';
  const orderId = 'order_test123';
  const paymentId = 'pay_test456';

  it('accepts valid HMAC SHA256 signature', () => {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(verifyOrderPaymentSignature(orderId, paymentId, signature, secret)).toBe(true);
  });

  it('rejects tampered signature', () => {
    expect(verifyOrderPaymentSignature(orderId, paymentId, 'deadbeef'.repeat(8), secret)).toBe(
      false,
    );
  });

  it('rejects when secret is missing', () => {
    expect(verifyOrderPaymentSignature(orderId, paymentId, 'abc', undefined)).toBe(false);
  });
});
