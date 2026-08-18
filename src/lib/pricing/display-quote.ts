/**
 * Display-only quote merge. Checkout still uses chooseCheckoutAmount.
 * Equal finals keep the coupon quote so the UI matches reservation precedence.
 */

export function pickBetterDisplayQuote<T extends { final_amount_paise: number }>(
  coupon: T | undefined,
  campaign: T | undefined,
): T | undefined {
  if (!coupon) return campaign;
  if (!campaign) return coupon;
  return campaign.final_amount_paise < coupon.final_amount_paise ? campaign : coupon;
}
