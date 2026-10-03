# Observability

> Status: CANONICAL
> Last Verified: 2026-10-03
> Verification Scope: Live logging + interview diagnostic events (Phase 2.2 staging readiness)
> Authority: Current logging/telemetry — not the historical RFC backlog

## Purpose

Describe **live** observability. Design RFCs / execution plans are archived under `docs/archive/pre-governance-2026-09-27/`.

## Current State

- **No unified APM** (no Sentry/Datadog/OTel in package.json) — Vercel log stream + DB tables
- Prefixed console families: `[payment:*]`, interview telemetry, `[VOICE_PIPELINE]`, `[ai-completion]`, …
- Durable: `ai_call_logs`, `voice_usage_logs`, `provider_health_logs`, rollups, `product_events`
- **Interview diagnostics (failure-biased):** `interview_diagnostic_events` via `POST /api/interview/diagnostics` (authenticated + ownership). Schema v1 catalog in `src/lib/diagnostics/event-contract.ts`. Not funnel SoT.
- Request IDs: sparse (exemplary on resume upload); business IDs (`interviewId`, `paymentId`) + client `runId` / `correlation_id` are the spine
- Crons: health-snapshot, daily-rollup, plan-expiry, …, **`prune-interview-diagnostics`** (see `vercel.json`)
- Retention for diagnostic rows: **90 days**, implemented by RPC `prune_interview_diagnostic_events` (migration 111) + daily cron `GET /api/cron/prune-interview-diagnostics` (bounded batches; diagnostics table only)

### Interview diagnostics (admin investigation)

| Layer | Behavior |
|---|---|
| Client | `emitInterviewDiagnostic` — bounded queue, 15s dedupe, 2s fetch timeout, never throws |
| Session hooks | Network offline/online (transition-deduped); narrow `window` error / unhandledrejection → `client_exception` (skips diagnostic self-noise; no global APM dump) |
| Emitters (live) | Mic/STT (pipeline + Deepgram), TTS request vs playback classification, answer/question `/turn` load failures, network, client exceptions |
| Ingest | Auth session required; ownership check; **diagnostics-specific** rate gate (see below); allowlisted event types + metadata |
| Confirmation | `client_reported` vs `server_confirmed` — UI must not treat client reports as independently verified |
| Admin | Joined in `loadAdminInterviewReview` (limit 100); timeline filter `diagnostics`; metadata allowlist re-applied at load |
| Gaps | Browser crash / killed tab / blocked beacons → missing events ≠ healthy session. `session_ready` / `session_resumed` / `voice_reconnect_attempt` remain catalogued but intentionally not required emitters. |

### AI correlation (`ai_call_logs.interview_id`)

| Path | Correlated? |
|---|---|
| `POST /api/interview/script/turn` | Yes (`completeInterviewChat({ interviewId, userId })`) |
| `POST /api/interview/script/answer-score` | Yes |
| `POST /api/interview/script/auto-structure` | Yes |
| Script report synthesis (`runSynthesis`) | Yes when `interviewId`/`userId` threaded from report generation |
| Non-interview AI (coach, free tools, ATS, …) | **No** — no reliable interview id; do not invent one |

### Rate-limit / reliability policy (diagnostics ingest)

Diagnostics uses `checkDiagnosticIngestRateLimit` (`src/lib/diagnostics/rate-limit-gate.ts`). This is **stricter than** the shared `checkRateLimit` helper used by payments/STT/start (those keep global defaults).

| Condition | Diagnostics ingest | Shared `checkRateLimit` (other routes) |
|---|---|---|
| Redis configured + healthy | Charge per-event cost; allow until caps | Default / `failClosed` per caller |
| Redis configured but errors/timeouts | **Drop** (204), no DB write (`failClosed`) | `failClosed` callers deny; others fail-open |
| Redis unconfigured / placeholder | **Drop** (204), no DB write | **Fail-open** (local DX for other routes) |
| Concurrent requests | Fixed-window slots; brief overshoot possible | Same window algorithm |
| Duplicate `client_event_id` | Insert no-ops (`23505`); **still consumes** RL capacity | n/a |
| Malformed / oversized body | 400 (invalid) or 204 drop (empty/oversized) before DB | n/a |

Caps: **60 events/user/min** + **40 events/interview/min**. Interview UX remains non-blocking (client never surfaces telemetry errors).

### Privacy boundaries

- Metadata keys allowlisted in `DIAGNOSTIC_METADATA_KEYS`; transcripts/answers/tokens stripped.
- Error codes are short classifiers — never free-form stacks or answer text.
- Admin loader re-sanitizes metadata; UI does not render raw JSON blobs.
- Service-role only for insert/select/delete; candidates have no direct table access.

### Staging readiness checklist (operational)

Certified staging Supabase project ref (code SoT): `iiowrzfwemaxytbykjrg` (`STAGING_SUPABASE_PROJECT_REF`). Production ref for rejection: `plfuvgkycmxcyshrgpgv`.

1. **Identity** — Confirm Preview deployment SHA includes diagnostics commits; `APP_ENV=staging`; `EXPECTED_SUPABASE_PROJECT_REF` + `NEXT_PUBLIC_SUPABASE_URL` match certified staging (never production).
2. **Redis** — Staging Preview must have non-placeholder `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (diagnostics drops all writes if absent).
3. **Cron** — `CRON_SECRET` present on Preview; `vercel.json` registers `prune-interview-diagnostics` only after that deploy.
4. **Flags** — Keep `INTERVIEW_RECOVERY_EMAIL_ENABLED` unset/`≠1`; `ALLOW_STAGING_EMAIL=false` unless an approved email test is explicitly authorized.
5. **Migrations (approval required)** — Staging already has Batch A/B schema effects for local serials **100–109** (ledger may use MCP timestamp versions for some rows). Staging `postgres` → `public` default privileges cleaned (Phase 6A). Do **not** apply **110/111** until checklist items 1–4 are verified on Preview **and** explicit staging approval is recorded. Execution packet: [`DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md`](../Operations/DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md). Never `supabase db push` without approval. Recovery = corrective follow-on migration (no rollback). Alignment record: [`STAGING_PROD_ALIGNMENT_CLOSURE.md`](../Operations/STAGING_PROD_ALIGNMENT_CLOSURE.md).
6. **E2E fixtures** — Use a dedicated staging test user + disposable interview; never real candidate sessions.
7. **Admin review** — Open `/platform/feedback/interview/[id]` as platform admin; confirm client vs server confirmation labels and honest empty state.
8. **Retention dry-run** — Only against synthetic expired diagnostic rows; verify batch bounds and that `interviews` / `credit_transactions` / `product_events` row counts are unchanged.
9. **Go/no-go** — Do not promote to production until: migrations applied on staging, Redis+CRON verified on Preview, E2E matrix green, recovery email remains off, no credit/lifecycle regressions.

## Architecture / Rules

- Extend existing emitters/prefixes; don’t invent a parallel logger for one feature
- `product_events` = funnel SoT; GA4 backup — **do not** dump failure diagnostics into funnel SoT
- `interview_diagnostic_events` = failure-oriented operational diagnostics only
- Payment debugging often = Vercel log grep within retention (Unknown retention — plan-dependent)
- Logging failure must never block interviews or change credit/lifecycle semantics
- Diagnostic prune must never touch interviews, credits, or `product_events`

## Dependencies

[SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [VOICE_PIPELINE](../Core/VOICE_PIPELINE.md) · [PAYMENTS](../Core/PAYMENTS.md) · [ROUTING](../Core/ROUTING.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md) · [DATABASE_MIGRATIONS](DATABASE_MIGRATIONS.md)

## Failure Modes

PII in logs · assuming beacons persist (some only console) · treating dead `realtime_session_metrics` as live · treating empty diagnostics as a healthy session · Redis-unconfigured unbounded writes (**mitigated for diagnostics only** by `rate-limit-gate`)

## Verification

Grep prefixes · `npx vitest run src/lib/diagnostics src/app/api/interview/diagnostics src/app/api/cron/prune-interview-diagnostics` · admin investigation page with durable fixtures · don’t claim MCP/APM without code

## Change Triggers

New prefix family · new telemetry table · adopting third-party APM (CSP + DEC) · changing retention days / prune batch sizes · changing diagnostics Redis gate

## Related Documents

Archive OBSERVABILITY.md / RFCs / execution plan for historical design depth
