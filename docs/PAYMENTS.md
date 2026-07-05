# Payments — InterviewEra

Quick-reference for the Razorpay payment/plan-activation architecture. For the full incident write-up, sequence diagrams, and test scenario table, see [PAYMENT_ARCHITECTURE.md](../PAYMENT_ARCHITECTURE.md) at the repo root — that document is authoritative for the "why"; this one is the fast lookup.

---

## Summary

Dual-path idempotent activation: both the checkout-verify route and the Razorpay webhook call the same `activatePlanAfterPayment()` function, so whichever arrives first activates the plan and the other replays safely. The idempotency marker is **`users.last_payment_id === paymentId`** — never `payments.status` (that conflation caused a real production incident; see [PAYMENT_ARCHITECTURE.md §4](../PAYMENT_ARCHITECTURE.md)).

## Key files

| File | Role |
|---|---|
| `src/lib/razorpay/activate-plan.ts` | Single source of truth — plan, credits, expiry, payment row, ledger, `last_payment_id` |
| `src/lib/razorpay/activation-api-response.ts` | Maps internal result → `activated` / `alreadyActivated` / `activationFailed` |
| `src/app/api/payments/verify/route.ts` | Validates Razorpay payload → calls `activatePlanAfterPayment()` |
| `src/app/api/payments/webhook/route.ts` | Validates webhook signature → calls `activatePlanAfterPayment()` on `payment.captured`/`order.paid` |
| `src/app/api/payments/create-order/route.ts` | Auth + per-user rate limit (5/60s, fail-closed) + `auditRazorpayConfig()` before creating an order |
| `src/lib/razorpay/payment-log.ts` | Structured `[payment:*]` logs (order_id, payment_id, user_id) — grep-able in Vercel logs |
| `src/lib/pricing/plans.ts` | Plan tiers: `starter` (₹149/30 days/8 credits), `pro` (₹399/30 days/25 credits) |
| `src/lib/razorpay/activate-plan.test.ts` | 11 documented concurrency/idempotency scenarios |

## Database

Credit RPCs (`deduct_credit`, `add_credit`, `refund_credit`) and `credit_transactions` inserts are **service-role-only** as of migration `050_production_security_hardening.sql` — see [CLAUDE.md Critical Invariant #2](../CLAUDE.md#critical-invariants).

---

## High risk: Payments (Razorpay)

**Why high risk**: real money, and the system already had one production incident (payment `pay_T1Xu1KmV48WWzM` — user paid, stayed on Free plan) from a race between the verify and webhook paths.
**Dependencies**: `users.last_payment_id`/`last_order_id` columns, migration 050's RPC lockdown, Redis rate limiting (fail-closed on this route).
**Common mistakes**: treating `payments.status` as an activation signal; deploying verify/webhook/activate-plan out of sync (deploy these files atomically); using `!=` instead of a NULL-safe comparison against `last_payment_id` in the optimistic-lock query (first-time buyers have `last_payment_id IS NULL`, and `NULL != value` is unknown in SQL).
**Verification required before changes**: run `npx vitest run src/lib/razorpay/` and manually trace both the verify-first and webhook-first orderings.
