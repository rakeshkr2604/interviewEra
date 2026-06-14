/**
 * Structured payment logs — grep in Vercel: `[payment:*]`.
 * Never log secrets, full key IDs, or webhook signatures.
 */

type PaymentLogScope = 'create-order' | 'checkout' | 'verify' | 'webhook' | 'expiry';

type PaymentLogLevel = 'info' | 'warn' | 'error';

function emit(
  level: PaymentLogLevel,
  scope: PaymentLogScope,
  event: string,
  data?: Record<string, unknown>,
): void {
  const payload = { event, ...data };
  const tag = `[payment:${scope}] ${event}`;
  try {
    const line = JSON.stringify(payload);
    if (level === 'error') console.error(tag, line);
    else if (level === 'warn') console.warn(tag, line);
    else console.info(tag, line);
  } catch {
    if (level === 'error') console.error(tag, payload);
    else if (level === 'warn') console.warn(tag, payload);
    else console.info(tag, payload);
  }
}

export function paymentLog(
  scope: PaymentLogScope,
  event: string,
  data?: Record<string, unknown>,
): void {
  emit('info', scope, event, data);
}

export function paymentWarn(
  scope: PaymentLogScope,
  event: string,
  data?: Record<string, unknown>,
): void {
  emit('warn', scope, event, data);
}

export function paymentError(
  scope: PaymentLogScope,
  event: string,
  data?: Record<string, unknown>,
): void {
  emit('error', scope, event, data);
}
