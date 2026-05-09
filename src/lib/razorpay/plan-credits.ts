/**
 * Plan credit grants — safe to import from Client Components (no Razorpay SDK init).
 * Mirrors webhook grant amounts in lib/razorpay/client subscription flow.
 */
export const PLAN_ACTIVATION_CREDITS: Record<string, number> = {
  starter: 12,
  pro: 30,
  starter_annual: 144,
  pro_annual: 360,
}
