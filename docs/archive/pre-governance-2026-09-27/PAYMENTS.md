# Payments — InterviewEra

Quick-reference for the Razorpay payment/plan-activation architecture. For the full incident write-up, sequence diagrams, and test scenario table, see [PAYMENT_ARCHITECTURE.md](../PAYMENT_ARCHITECTURE.md) at the repo root — that document is authoritative for the "why"; this one is the fast lookup.

---

## Summary

Dual-path idempotent activation: both the checkout-verify route and the Razorpay webhook call the same `activatePlanAfterPayment()` function, so whichever arrives first activates the plan and the other replays safely. The idempotency marker is **`users.last_payment_id === paymentId`** — never `payments.status` (that conflation caused a real production incident; see [PAYMENT_ARCHITECTURE.md §4](../PAYMENT_ARCHITECTURE.md)).

**Ownership is not completeness.** `users.last_payment_id === paymentId` proves that the payment won the entitlement CAS. A locally complete activation additionally requires the exact server-side entitlement snapshot on `payments`, a matching `paid` payment binding, one payment-owned credit-ledger row, and consumption of the exact campaign redemption when present. Replays call the service-role-only `complete_payment_activation_local` RPC to atomically verify/heal the payment and ledger artifacts, then replay the existing campaign-consumption recovery. Recovery never changes the user's credits, tier, or expiry and never emits another `payment_completed` product event.

**Provider validation before ownership.** Verify and webhook fetch the Razorpay order and payment entity, then apply one shared provider-to-local contract before activation. The captured payment ID/order ID/amount/currency and paid order ID/amount/currency/status must match the server-owned `payments` row. Currency is strictly `INR`; a pre-existing different local `payments.payment_id` is rejected before the user ownership CAS. Campaign orders compare against their frozen `payments.amount`, never current list price or a re-quoted campaign.

## Key files

| File | Role |
|---|---|
| `src/lib/razorpay/activate-plan.ts` | Single source of truth — plan, credits, expiry, payment row, ledger, `last_payment_id` |
| `src/lib/razorpay/provider-payment-validation.ts` | Shared Razorpay order/payment entity ↔ local expected-order validator |
| `supabase/migrations/088_phase7a_payment_activation_recovery.sql` | Immutable entitlement snapshot + one-payment/one-ledger identity + atomic local replay completion RPC |
| `src/lib/razorpay/activation-api-response.ts` | Maps internal result → `activated` / `alreadyActivated` / `activationFailed` |
| `src/app/api/payments/verify/route.ts` | Validates Razorpay payload → calls `activatePlanAfterPayment()` |
| `src/app/api/payments/webhook/route.ts` | Validates webhook signature → calls `activatePlanAfterPayment()` on `payment.captured`/`order.paid` |
| `src/app/api/payments/create-order/route.ts` | Auth + per-user rate limit (5/60s, fail-closed) + `auditRazorpayConfig()` before creating an order. Amount is always server-calculated from `PAID_PLANS` ± live `pricing_campaigns` ± coupon (best of, never stacked). Never trust client `amount` / `price` / `campaignId`. |
| `src/lib/pricing/effective-price.ts` | Global sale quote: `starts_at <= now < ends_at` even if `is_active` was left true after expiry. |
| `src/lib/razorpay/payment-log.ts` | Structured `[payment:*]` logs (order_id, payment_id, user_id) — grep-able in Vercel logs |
| `src/lib/pricing/plans.ts` | Plan tiers: `starter` (₹299 list, ₹149 promo floor/30 days/8 credits), `pro` (₹799 list, ₹399 promo floor/30 days/25 credits) |
| `src/lib/razorpay/activate-plan.test.ts` | 11 documented concurrency/idempotency scenarios |

## Database

Credit RPCs (`deduct_credit`, `add_credit`, `refund_credit`) and `credit_transactions` inserts are **service-role-only** as of migration `050_production_security_hardening.sql` — see [CLAUDE.md Critical Invariant #2](../CLAUDE.md#critical-invariants).

Payment activation recovery is also service-role-only. `credit_transactions.payment_id` has a partial unique index for payment-credit rows. New activation snapshots store the exact credits and entitlement timestamps before the ownership CAS; replay uses those historical values and never current UI pricing or a recalculated expiry. A pre-Phase-7A activation with no trustworthy linked ledger/snapshot fails closed rather than guessing. A physically missing base `payments` order row also fails closed because its original amount/campaign authority cannot be reconstructed safely.

---

## High risk: Payments (Razorpay)

**Why high risk**: real money, and the system already had one production incident (payment `pay_T1Xu1KmV48WWzM` — user paid, stayed on Free plan) from a race between the verify and webhook paths.
**Dependencies**: `users.last_payment_id`/`last_order_id` columns, migration 050's RPC lockdown, Redis rate limiting (fail-closed on this route).
**Common mistakes**: treating `payments.status` as an activation signal; treating a signed webhook event name as proof of amount/currency/status; treating `last_payment_id` as proof that downstream artifacts exist; recomputing historical credits/expiry during recovery; deploying verify/webhook/activate-plan/migration out of sync; using `!=` instead of a NULL-safe comparison against `last_payment_id` in the optimistic-lock query (first-time buyers have `last_payment_id IS NULL`, and `NULL != value` is unknown in SQL).
**Verification required before changes**: run `npx vitest run src/lib/razorpay/` and manually trace both the verify-first and webhook-first orderings.
