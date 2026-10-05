# Backend Schema

> Status: CANONICAL
> Last Verified: 2026-10-05
> Verification Scope: Core + V2.1 + billing tables (migrations + code usage) + stale-abandon RPC + V2.1 question-plan columns on questions
> Authority: Schema overview for agents (migrations remain legal SoT)

## Purpose

Orientation to tables agents touch most. Full history = `supabase/migrations/`. Naming rules → [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md).

## Current State

### Identity & access

| Table / object | Notes |
|---|---|
| `users` | plan_tier, credits, `last_payment_id`, platform_role; UPDATE allowlist (Invariant #3) |
| `campus_organizations` | verification_status gating |
| Credit RPCs | service-role-only (Invariant #2) |
| `credit_transactions` | ledger; payment-linked uniqueness for grants |

### Interview V2.1

| Table | Notes |
|---|---|
| `interviews` | `engine='v2.1'` + script columns; one-active partial unique index |
| `script_turns` | turn_index, question/answer, follow-up flags, structure fields |
| `questions` | Shared with V1. V2.1 core plans use nullable `question_type`, `difficulty`, `source`, `plan_status` (`planned`/`asked`/`skipped`), `grounding`. `plan_status` NULL means a legacy V1 row. Partial unique index on `(interview_id, order_index)` only where `plan_status` is set. Migration 113. |
| `answer_evaluations` | per-answer scores |
| `script_interview_reports` | completion reports |
| `resume_interview_snapshots` | resume freeze at interview |
| `abandon_stale_active_interviews()` | service-role RPC (migration 109 replaces return type); returns `(interview_id, user_id)` per transitioned stale V2.1 active row; 45m last-activity; stale predicate re-checked on UPDATE; no credit change; no `product_events` write in SQL |

### Billing

| Table | Notes |
|---|---|
| `payments` | order authority + entitlement snapshot (Phase 7A) |
| `pricing_campaigns` | timed sales; server quote |

### Telemetry / product

| Table | Notes |
|---|---|
| `ai_call_logs`, `voice_usage_logs`, `provider_health_logs`, … | migration 023 (+033 grants) |
| `product_events` | service-role writes; funnel SoT |

### Historical / do-not-assume-active

V1 dual-agent tables (`conversation_states`, `answer_analyses`, …) may remain in DB from migrations — **engine removed**. `subscriptions`, `realtime_session_metrics` (no writer), roadmap tables — deprecated.

## Architecture / Rules

- RLS on every new table + matching GRANTs
- Prefer additive migrations; no DROPs without founder sign-off + row counts

## Dependencies

Migration chain through latest `NNN_*.sql` (do not hardcode count).

## Failure Modes

| Mistake | Risk |
|---|---|
| Grant authenticated credit RPC | Privilege escalation (050 lesson) |
| RLS without GRANT | Silent 42501 (033 lesson) |
| Widen users UPDATE allowlist | Invariant #3 break |

## Verification

`npm run verify:migrations` · review new SQL against invariants #2/#3/#10

## Change Triggers

New table/column · RPC · RLS/GRANT · anything on `users` / credits / payments

## Related Documents

[PAYMENTS](PAYMENTS.md) · [INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md)
