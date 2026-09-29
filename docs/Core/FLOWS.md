# Flows

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Primary user journeys vs current routes
> Authority: End-to-end product flows

## Purpose

Short maps of the main journeys. Route inventory → [ROUTING.md](ROUTING.md).

## Current State

### A. Candidate — first paid practice (happy path)

1. Signup / login → dashboard
2. Upload resume → parse (degraded OK)
3. **Start Interview** → `/interview/script/start` → `POST /api/interview/script/start`
4. Session `/interview/script/[id]`: turns ± TTS/STT → answer-score
5. Complete → script report

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
