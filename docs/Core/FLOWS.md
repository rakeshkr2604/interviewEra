# Flows

> Status: CANONICAL
> Last Verified: 2026-10-10
> Verification Scope: Primary user journeys vs current routes + Insights/retention v2.1 wiring
> Authority: End-to-end product flows

## Purpose

Short maps of the main journeys. Route inventory → [ROUTING.md](ROUTING.md).

## Current State

### A. Candidate — first paid practice (happy path)

1. Signup / login → dashboard
2. Upload resume → parse (degraded OK)
3. **Start Interview** → `/interview/script/start` (honors `role` / `mode` / `difficulty` / `focus` query params from roadmap & tools) → `POST /api/interview/script/start`
4. Session `/interview/script/[id]`: turns ± TTS/STT → answer-score
5. Complete → retention rollup (streak/XP/tier; repair PATCH returns retention for streak UI refresh) + script report
6. Insights (`/readiness`, `/roadmap`, `/analytics`, `/notifications`) read `script_interview_reports` (V1 `reports` only as legacy fallback)

### A2. Resume unfinished V2.1 (same interview row)

1. Dashboard / History / Notifications surface unfinished sessions:
   - Active (`pending`/`in_progress`): **Continue interview** → session URL
   - Abandoned one-continue eligible (`credit_deducted` + `!abandoned_resume_used`): **Resume interview** → `POST /api/interview/{id}/resume` → same row reopened to `in_progress` (no extra credit)
2. Hero / notification recovery target is resolved by `fetchPrimaryRecoveryInterview` (dedicated `LIMIT 1` queries), **not** by the recent-interviews pagination window
3. Finish session → complete as usual → report
4. Second abandon after resume is terminal (`abandoned_resume_used`)

Does **not** convert historical abandoned → completed without the candidate finishing.

### A3. Recovery email reminders (Phase 2, flag-gated)

1. Daily UTC cron `GET /api/cron/interview-recovery-reminders` (Bearer `CRON_SECRET`); timing jitter accepted
2. Dry-run inventory: `?dryRun=1` (works with flag off; never claims/sends). Ambiguous dryRun values also force dry-run.
3. Real sends only when `INTERVIEW_RECOVERY_EMAIL_ENABLED=1` and dryRun is absent
4. Stages (abandon `completed_at` age): `r1` ∈ [24h, 72h); `r2` ∈ [72h, 7d]; late ≥72h skips `r1`
5. Suppress if `interviewReminders` off **or** global unsub (`email_digest_unsubscribed` / `email_preferences.unsubscribed_all`)
6. Revalidate eligibility twice → Resend `interview_recovery` via `sendLifecycleTemplate` / `lifecycle_email_log`
7. CTA → `/dashboard`; prefs → `/settings`

Off by default. Does not change credits, interview status, or in-app notification content.

### B. Checkout

1. Upgrade → `POST /api/payments/create-order` (server amount)
2. Razorpay Checkout
3. `verify` and/or `webhook` → `activatePlanAfterPayment`
4. Redirect dashboard (no polling required)

### C. Campus org

1. College signup / join
2. Org `verification_status` gate (Invariant #10)
3. Campus admin APIs via `requireCampusAuth`

### D. Historical report

Legacy `/report/[id]` may open **old V1 rows**. New completions use script report path. Do not start V1 interviews.

## Architecture / Rules

- One active non-terminal interview per user
- Credits deducted at script start (service-role RPC)
- Scores always present on complete
- Abandoned one-continue uses the same interview row (no second debit / no refund)

## Dependencies

[INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [PAYMENTS](PAYMENTS.md) · [RESUME_PIPELINE](RESUME_PIPELINE.md)

## Failure Modes

| Flow break | Signal |
|---|---|
| Active interview | Start 409 |
| Payment race | Dual-path replay |
| Resume extract weak | Continue with fallback parse |

## Verification

Manual smoke of A–B on preview; payments dual-order on payment changes.

## Change Triggers

Start CTA targets · checkout UX · campus verification gates

## Related Documents

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [ROUTING](ROUTING.md)
