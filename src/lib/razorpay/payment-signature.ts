import crypto from 'crypto';

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeHexEqual(expected: string, actual: string): boolean {
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(actual, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Pure HMAC verify — testable without Razorpay SDK init. */
export function verifyOrderPaymentSignature(
  orderId: string,
  paymentId: string,
  clientSignature: string,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  try {
    const expected = hmacSha256Hex(secret, `${orderId}|${paymentId}`);
    return timingSafeHexEqual(expected, clientSignature);
  } catch {
    return false;
  }
}
