/**
 * Razorpay environment validation — detects test/live drift before checkout.
 * Never log key_secret or webhook_secret; key_id prefix is safe to log.
 */

export type RazorpayMode = 'test' | 'live' | 'unknown';

export function detectRazorpayMode(keyId: string | undefined): RazorpayMode {
  if (!keyId) return 'unknown';
  if (keyId.startsWith('rzp_live_')) return 'live';
  if (keyId.startsWith('rzp_test_')) return 'test';
  return 'unknown';
}

/** Safe for logs — e.g. rzp_live_****abcd */
export function maskRazorpayKeyId(keyId: string | undefined): string {
  if (!keyId) return '(unset)';
  if (keyId.length <= 12) return `${keyId.slice(0, 4)}****`;
  return `${keyId.slice(0, 8)}****${keyId.slice(-4)}`;
}

export interface RazorpayConfigIssue {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
}

export function auditRazorpayConfig(): RazorpayConfigIssue[] {
  const issues: RazorpayConfigIssue[] = [];

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  if (!keyId) {
    issues.push({
      code: 'MISSING_KEY_ID',
      message: 'RAZORPAY_KEY_ID is not set',
      severity: 'critical',
    });
  }
  if (!keySecret) {
    issues.push({
      code: 'MISSING_KEY_SECRET',
      message: 'RAZORPAY_KEY_SECRET is not set',
      severity: 'critical',
    });
  }
  if (!webhookSecret) {
    issues.push({
      code: 'MISSING_WEBHOOK_SECRET',
      message: 'RAZORPAY_WEBHOOK_SECRET is not set — webhooks will be rejected',
      severity: 'critical',
    });
  }

  const mode = detectRazorpayMode(keyId);

  if (process.env.NODE_ENV === 'production' && mode === 'test') {
    issues.push({
      code: 'TEST_KEYS_IN_PRODUCTION',
      message:
        'RAZORPAY_KEY_ID is a test key (rzp_test_*) in production — payments will not appear in the live dashboard',
      severity: 'critical',
    });
  }

  if (publicKeyId && keyId && publicKeyId !== keyId) {
    issues.push({
      code: 'PUBLIC_SERVER_KEY_MISMATCH',
      message:
        'NEXT_PUBLIC_RAZORPAY_KEY_ID differs from RAZORPAY_KEY_ID (unused by checkout, but indicates env drift)',
      severity: 'high',
    });
  }

  if (publicKeyId && keyId) {
    const publicMode = detectRazorpayMode(publicKeyId);
    if (publicMode !== 'unknown' && mode !== 'unknown' && publicMode !== mode) {
      issues.push({
        code: 'MIXED_TEST_LIVE',
        message: 'NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_ID are from different Razorpay modes',
        severity: 'critical',
      });
    }
  }

  return issues;
}

/** Throws on critical misconfiguration — call before order creation. */
export function assertRazorpayProductionReady(): void {
  const critical = auditRazorpayConfig().filter((i) => i.severity === 'critical');
  if (critical.length === 0) return;

  const summary = critical.map((i) => i.code).join(', ');
  throw new Error(`Razorpay configuration invalid: ${summary}`);
}
