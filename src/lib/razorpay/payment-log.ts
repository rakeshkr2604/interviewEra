/**
 * Structured payment logs — grep in Vercel: `[payment:*]`.
 * Never log secrets, full key IDs, or webhook signatures.
 */

type PaymentLogScope = 'create-order' | 'checkout' | 'verify' | 'webhook' | 'activate' | 'expiry';

type PaymentLogLevel = 'info' | 'warn' | 'error';

export interface PaymentTraceIds {
  order_id?: string;
  payment_id?: string;
  user_id?: string;
}

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

/** Activation pipeline logs — always include order_id, payment_id, user_id when known. */
export function activationLog(
  event: string,
  ids: PaymentTraceIds,
  data?: Record<string, unknown>,
): void {
  paymentLog('activate', event, { ...ids, ...data });
}

export function activationError(
  event: string,
  ids: PaymentTraceIds,
  data?: Record<string, unknown>,
): void {
  paymentError('activate', event, { ...ids, ...data });
}
