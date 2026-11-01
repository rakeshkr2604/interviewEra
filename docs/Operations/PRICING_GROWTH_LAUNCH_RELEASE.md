# Pricing & Growth Launch — Release Notes and Runbook

> Status: CANONICAL (ops runbook)
> Last Verified: 2026-11-01 (local verification on branch `feature/pricing-growth-launch`; staging apply NOT yet run)
> Verification Scope: Pricing ₹399 / ₹999, Free 2 credits for new signups, account-gated free tools, fair-use limits, EARLY100 launch coupon
> Authority: Release packet. It does **not** authorize applying migrations, merging to `main`, or `vercel --prod`.

## Purpose

What this release changes, how to verify it on staging, and the exact steps to launch the EARLY100 coupon.

## Current State

| Area | Change | Source of truth |
|---|---|---|
| Prices | Starter ₹399 (39,900 paise) · Pro ₹999 (99,900 paise); floors ₹339 / ₹849; credits 8 / 25; 30 days; one-time | `src/lib/pricing/plans.ts` |
| Free credits | New signups get 2 lifetime credits; existing balances untouched | migration `119`, `FREE_PLAN.credits` |
| Free tools | Interactive use needs a signed-in, verified account; public pages stay indexable | `src/lib/security/free-tool-access.ts`, `src/components/tools/FreeToolAuthGate.tsx` |
| Fair use | Per-account hourly + daily, per-IP ceiling, one atomic Redis script | `src/lib/security/free-tool-rate-limit.ts` |
| Launch coupon | `EARLY100`: 10%, Starter + Pro, cap 100, one per user → ₹359 / ₹899 | `src/lib/pricing/launch-offer.ts` + existing campaign RPCs |
| Homepage offer notice | `/` is ISR, so the pricing preview fetches `GET /api/pricing/launch-offer` (read-only, reuses `loadLaunchOffer`, CDN cache 60s) when it nears the viewport. It renders nothing unless the offer is live. Pausing an offer can take up to 60s to clear on the homepage; checkout always re-validates | `src/components/landing/LandingLaunchOfferNotice.tsx` |
| Funnel | `free_tool_auth_gate_shown`, `free_tool_first_completed` (once per user, migration `120`) | `src/lib/analytics/free-tool-events.ts` |

Out of scope: AI / voice cost estimation, the cost engine, and the mock-interview credit lifecycle.

## Migrations

| File | Effect | Risk |
|---|---|---|
| `119_free_tier_two_signup_credits.sql` | `users.credits_remaining` default 2; `handle_new_user()` grants 2 (012 sanitisation kept); 059 EXECUTE lockdown re-asserted | No UPDATE of existing rows. Deploy the app in the same window so `ensure-public-user` and the trigger agree. |
| `120_free_tool_first_completed_milestone.sql` | Partial unique index on `product_events (event_name, user_id)` for the milestone only | Index build scans `product_events` once (non-concurrent, inside a transaction). Apply off-peak if the table is large. |

### Staging apply (operator)

Follow [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md).

1. Confirm the project is staging, ref `iiowrzfwemaxytbykjrg`. Do not assume `.env.local` is staging: verify its project ref first. Local `next dev/build/start` refuse the production project (`src/lib/env/local-production-guard.ts`).
2. Compare the `schema_migrations` ledger with the repo. 118 should be the highest applied migration.
3. Apply 119, then 120.
4. Probes:
   - `SELECT column_default FROM information_schema.columns WHERE table_name='users' AND column_name='credits_remaining';` → `2`
   - `SELECT prosrc FROM pg_proc WHERE proname='handle_new_user';` contains `'free',\n    2`
   - `SELECT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE');` → `false`
   - `SELECT indexname FROM pg_indexes WHERE indexname='uq_product_events_free_tool_first_completed';` → 1 row
   - Create a test signup → `credits_remaining = 2`. A pre-existing test user keeps its balance.

## EARLY100 activation (admin, staging first)

1. In `/platform/rewards`, create code `EARLY100`: kind promo, label "Early access launch offer", percent 10, plans Starter + Pro, max redemptions 100, **inactive**, no start date. The API accepts this draft.
2. When the founder fixes the real launch date, set `starts_at` (and `expires_at` if wanted), then activate. The API refuses activation without `starts_at` or with a cap other than 100.
3. Verify the Test Quote on the admin page shows ₹359 / ₹899.
4. Open `/pricing`. The launch section appears only after `starts_at`, and shows "N of 100 left", where N counts consumed redemptions only.
5. Razorpay **test mode** on staging, with one account:
   - Buy Starter with `EARLY100` → ₹359 charged, plan active, redemption `consumed`.
   - Retry the same code → `CODE_ALREADY_USED`.
   - Abandon a checkout → the reservation is released by the cron (`release-expired-code-reservations`), and the remaining count is unchanged.
   - Replay the webhook → no second activation and no second consume.
6. To pause or end the offer, set `is_active=false` or `expires_at`. The section disappears on the next request.

Legacy campaign codes or global campaigns deeper than about 15% now fail the floors (`CODE_BELOW_MINIMUM` / skipped). Deactivate them before release.

## Pre-production checklist

- [ ] Staging: 119 + 120 applied with ledger and probe evidence
- [ ] Staging preview: anonymous visitor sees the gate on all four tools, and signed-in verified user can run each tool
- [ ] Staging: a rate-limit message appears after the 6th ATS run in an hour (Free account)
- [ ] Razorpay test mode: list checkout charges ₹399 / ₹999, and EARLY100 charges ₹359 / ₹899
- [ ] No old ₹299 / ₹799 orders left pending, or confirm they verify against their frozen amount
- [ ] Legacy deep-discount codes and campaigns deactivated
- [ ] Production: re-query ledger, apply 119 + 120, deploy the app in the same window
- [ ] EARLY100 activated only after the founder confirms the launch date

## Related Documents

[PAYMENTS](../Core/PAYMENTS.md) · [SECURITY](../Guidelines/SECURITY.md) · [SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md)
