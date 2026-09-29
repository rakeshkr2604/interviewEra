# Observability RFC Backlog — InterviewEra

**Status: PLANNING — no RFC below is implemented.**
Decomposition of [docs/OBSERVABILITY.md](OBSERVABILITY.md) into independently deployable, independently testable RFCs. Each RFC changes one subsystem. File paths were verified against the repository during the 2026-07-05 audit; re-verify before starting any RFC (the voice subsystem in particular changes frequently).

Conventions used below:
- **Risk Level** = production risk of the change itself (not the risk of *not* doing it).
- **Sizes**: Small (<2h) · Medium (half day) · Large (1–2 days) · XL (>2 days).
- All rollbacks assume Vercel instant rollback to the previous deployment; DB migrations are never rolled back destructively — unused tables/columns are left in place (house rule: migrations are additive, never rewritten).

---

## RFC-001 — Persist critical client telemetry beacons

**Why** — `interviewTelemetry({critical: true})` beacons (submit failures, phase timeouts, voice failure classes, recoveries) reach `/api/product-events` and are only console-logged as `[client-telemetry]`; they vanish with Vercel log retention. This is the single highest-value durability gap: it makes mobile interview failures queryable. (OBSERVABILITY.md §1.4, §2, Roadmap Phase 1.)

**Scope** — In the `/api/product-events` route, after the existing console emit, fire-and-forget each accepted event into the `product_events` table via the existing `persistProductEventAsync()`, under a discriminated event name (e.g. `event_name: 'client_telemetry'` with `type`/`event`/`interviewId`/`runId`/platform fields as props) so telemetry events can never be confused with funnel product events. Preserve the route's contract exactly: always 204, same rate limits, same body caps.

**Out of scope** — Any client change; any change to funnel/product event semantics or dedupe; dashboards reading the new rows; retention pruning (RFC-014).

**Files likely affected** — `src/app/api/product-events/route.ts`; possibly a small mapper in `src/lib/analytics/product-events-store.ts` or a sibling module. `src/lib/analytics/product-events.ts` only if the `ProductEventName` type needs the new discriminator name added.

**DB migrations** — None (reuses `product_events`; props column is jsonb).

**API changes** — None externally (route still always returns 204).

**Frontend changes** — None.

**Testing strategy** — Unit tests for the mapper (event → sanitized props, stream discriminator, user_id extraction absent → null); route-level test asserting 204 + persistence call on valid payload, 204 + no persistence on oversized/garbage payload; verify funnel dedupe tests still pass (`npm test`). Manual: fire a `critical: true` event from a dev session, confirm row in `product_events`.

**Rollback strategy** — Revert deploy. Rows already written are inert. Console emit is untouched, so observability never decreases mid-rollback.

**Deployment order** — Any time; no dependencies. Should ship **first** (highest value : risk ratio in the backlog).

**Risk Level** — Low. Additive write on an endpoint explicitly designed to never fail the caller. Main hazard is write volume: bounded by the existing 240/min/IP limit and 50-events/request cap.

**Expected engineering time** — Medium.

---

## RFC-002 — Durable payment activation events

**Why** — `[payment:*]` logs carry order_id/payment_id/user_id but are console-only; a repeat of the `pay_T1Xu1KmV48WWzM` incident older than log retention would be unreconstructable from logs. Payments is a High Risk System with a real prior incident. (OBSERVABILITY.md §5 Payments, P0.)

**Scope** — Mirror `activationLog`/`activationError` (and optionally verify/webhook entry+exit events) from `src/lib/razorpay/payment-log.ts` into `product_events` via `persistProductEventAsync` (event_name e.g. `payment_activation_event`, props: scope, event, order_id, payment_id, user_id, outcome). Console output unchanged. Strictly a tee inside the logging module — **zero changes to activation control flow**.

**Out of scope** — Any change to `activate-plan.ts`, verify/webhook routes' logic, idempotency marker, or response shapes; dashboards.

**Files likely affected** — `src/lib/razorpay/payment-log.ts` only.

**DB migrations** — None.

**API changes** — None.

**Frontend changes** — None.

**Testing strategy** — `npx vitest run src/lib/razorpay/` must pass untouched (the 11 concurrency/idempotency scenarios). New unit test: activationLog/activationError call persist with correct props and never throw when persistence fails (mock persist to reject). Manual trace of verify-first and webhook-first orderings per docs/PAYMENTS.md before merging (house rule for this subsystem).

**Rollback strategy** — Revert deploy; console logs were never touched.

**Deployment order** — Independent; recommended immediately after RFC-001.

**Risk Level** — Medium — not because the diff is complex (it's a tee), but because the file sits inside the payments High Risk System and the CLAUDE.md working rules demand the full verification ritual.

**Expected engineering time** — Small.

---

## RFC-003 — Resume extraction outcome telemetry

**Why** — The funnel depends on extraction succeeding on messy real-world PDFs, and the layered fallback chain (pdfjs → pdf-parse → OCR → regex fallback) currently reports nothing durable about which layer rescued or lost a user. (OBSERVABILITY.md §5 Resume parsing, P1.)

**Scope** — Emit one `product_events` row per upload/parse outcome: extraction method used, char count, quality score, PDF error code if hard-failed, duration, resumeId, requestId (available today in the upload route). Use existing `resume-analytics-server.ts` if it already has a suitable emitter — extend rather than duplicate.

**Out of scope** — Any change to extraction behavior, thresholds (`MIN_USEFUL_CHARS`), or user-facing error messages; OCR bounds; dashboards.

**Files likely affected** — `src/app/api/resume/upload/route.ts`, `src/app/api/resume/parse/route.ts`, `src/lib/analytics/resume-analytics-server.ts`, possibly `src/lib/resume/parse-pipeline-timing.ts`.

**DB migrations** — None.

**API changes** — None (response bodies unchanged).

**Frontend changes** — None.

**Testing strategy** — Unit tests for the outcome-event builder (each extraction layer → correct props). `npm run verify:pdf` must pass (mandatory for any change touching the extraction chain's call sites). Route tests confirming event emission doesn't alter status codes.

**Rollback strategy** — Revert deploy.

**Deployment order** — Independent.

**Risk Level** — Low–Medium (Low diff, but the files are in a High Risk System — run the domain check).

**Expected engineering time** — Medium.

---

## RFC-004 — Unified server logger module

**Why** — 436 scattered `console.*` calls across 155 files with ~15 prefix conventions and no shared envelope (requestId/userId/env/release/errorCode). Everything downstream (error persistence, correlation, MCP `searchLogs`) needs one emit path. (OBSERVABILITY.md §3.)

**Scope** — New module `src/lib/observability/logger.ts`: console-wrapping logger producing `[subsystem] event {json}` lines with the mandatory envelope (ts, level, service, subsystem, event, env from `VERCEL_ENV`, release from `VERCEL_GIT_COMMIT_SHA`, optional requestId/userId/interviewId/resumeId/paymentId/provider/durationMs/errorCode) and mechanical redaction (key-pattern denylist; email masking). Ship with **zero call-site adoption** — the module deploys dark.

**Out of scope** — Migrating any existing emitter (RFC-006/007/008); error persistence (RFC-005); client-side logging (the client contract in `interview-telemetry.ts` stays as-is).

**Files likely affected** — New: `src/lib/observability/logger.ts`, `src/lib/observability/logger.test.ts`, `src/lib/observability/redact.ts` (+ test).

**DB migrations** — None.

**API changes** — None.

**Frontend changes** — None.

**Testing strategy** — Pure unit tests: envelope completeness, level routing to console.error/warn/log, redaction denylist (secrets/tokens/signatures/cookies stripped; emails masked; UUIDs untouched), never-throws guarantee (JSON.stringify failure fallback — same defensive pattern as `payment-log.ts`).

**Rollback strategy** — Revert deploy; module has no callers, rollback is a no-op.

**Deployment order** — Before RFC-005/006/007/008. Can proceed in parallel with RFC-001/002/003.

**Risk Level** — Low (dead code until adopted).

**Expected engineering time** — Medium.

---

## RFC-005 — `app_error_events` table + durable error persistence

**Why** — Error-level server logs are the primary debugging signal and currently evaporate with Vercel retention. This table is the primary data plane for MCP `searchLogs`/`recentFailures`/`summarizeErrors`. (OBSERVABILITY.md §3.5.)

**Scope** — Additive migration creating `app_error_events` (ts, level, subsystem, event, error_code, request_id, user_id, interview_id, resume_id, payment_id, provider, release, env, props jsonb) with RLS enabled, service-role-only writes, matching table-level GRANTs (**apply the migration-033 lesson: RLS policies AND grants, both**), and indexes on (created_at), (subsystem, created_at), (error_code, created_at). Wire the RFC-004 logger so `level: 'error'` fire-and-forgets an insert (same non-blocking pattern as `persistProductEventAsync`) behind a simple per-instance token bucket to prevent write storms.

**Out of scope** — Adopting the logger anywhere (still zero call sites → table receives ~nothing until RFC-006+ land — that's fine and makes this safely testable in prod); retention pruning (RFC-014); warn-level sampling (later).

**Files likely affected** — New migration `supabase/migrations/05x_app_error_events.sql`; `src/lib/observability/logger.ts` (persistence hook + token bucket) + tests.

**DB migrations** — Yes — one, additive, numbered next in sequence.

**API changes** — None.

**Frontend changes** — None.

**Testing strategy** — Unit: error-level triggers persist, info/warn don't; persist failure never throws or blocks; token bucket drops excess. Migration review against CLAUDE.md invariants #2/#3 (service-role-only writes; no new grants to `authenticated`/`anon`).

**Rollback strategy** — Revert deploy (writes stop). Table remains, inert — never dropped as rollback.

**Deployment order** — After RFC-004, before RFC-006/007/008.

**Risk Level** — Low–Medium (new migration = review carefully, but nothing user-facing).

**Expected engineering time** — Medium.

---

## RFC-006 — Logger adoption: interview engine routes

**Why** — `api/interview/answer` alone has 12 raw console calls, including the `CRITICAL: All fallback insert attempts failed` path that guards Critical Invariant #4 (never a null score) — precisely the events that must be durable and correlated. (OBSERVABILITY.md §5 Interview engine, P0.)

**Scope** — Route the existing console calls in `api/interview/answer`, `api/interview/start`, `api/interview/complete`, `api/interview/process-answer` through the unified logger with `{subsystem: 'interview', interviewId, userId, errorCode}`. Log lines keep greppable event names; messages may change shape (from ad-hoc strings to envelope JSON) — acceptable because no tooling depends on the old shapes (verified: no log-parsing code in repo).

**Out of scope** — Any control-flow, response, retry, or fallback-behavior change; orchestrator/lib files (`interview-orchestrator.ts`, `conversation-state.ts`) — separate later pass; client telemetry.

**Files likely affected** — `src/app/api/interview/{answer,start,complete,process-answer}/route.ts`.

**DB migrations** — None.

**API changes** — None (response bodies/status codes byte-identical).

**Frontend changes** — None.

**Testing strategy** — Existing unit + e2e interview suites must pass unmodified. Diff review rule: every change is a logging-line substitution; any hunk touching non-logging code is rejected. Manual: run one dev interview end-to-end, confirm evaluation-fallback path still inserts all-5 scores.

**Rollback strategy** — Revert deploy; old console lines return.

**Deployment order** — After RFC-005. First adoption RFC (sets the pattern for RFC-007/008).

**Risk Level** — Medium — mechanical diff, but inside the money path of the product (answer submission/evaluation). Minimal-diff discipline is the mitigation.

**Expected engineering time** — Medium.

---

## RFC-007 — Logger adoption: payments internals

**Why** — Payment logs should carry the shared envelope (release, env, requestId when present) and flow into `app_error_events` on failures — while keeping the battle-tested `[payment:*]` grep surface. (OBSERVABILITY.md §3.1.)

**Scope** — Rewire `payment-log.ts`'s internal `emit()` to call the unified logger with `subsystem: 'payment'`, preserving the exact `[payment:<scope>] <event>` tag and the module's public API (`paymentLog/paymentWarn/paymentError/activationLog/activationError`) so all call sites in verify/webhook/activate-plan are untouched.

**Out of scope** — Any call-site change; RFC-002's product_events tee (compose, don't conflict — land RFC-002 first).

**Files likely affected** — `src/lib/razorpay/payment-log.ts` only.

**DB migrations** — None. **API changes** — None. **Frontend changes** — None.

**Testing strategy** — `npx vitest run src/lib/razorpay/`; unit test asserting tag-format parity (`[payment:activate] plan_activated` prefix unchanged) so Vercel grep muscle-memory keeps working.

**Rollback strategy** — Revert deploy.

**Deployment order** — After RFC-005 and RFC-002.

**Risk Level** — Medium (payments file; trivial diff).

**Expected engineering time** — Small.

---

## RFC-008 — Structured auth telemetry

**Why** — Auth is a High Risk System mid-migration (V2 flag) with zero structured telemetry: no login-failure rate, no OAuth-callback error visibility, no session-refresh failure signal, and the flag state is never logged — so a bad flag flip would be invisible until users complain. (OBSERVABILITY.md §5 Authentication, P1.)

**Scope** — Emit unified-logger events (subsystem `auth`) at existing decision points: login success/failure, signup outcome, OAuth callback error, session-refresh failure, `sb-*` cookie strip (`x-ie-sb-cookies-stripped` path), password-reset request — each including `authV2: isAuthV2Enabled()`. Persist the error-level ones via RFC-005 automatically. Optionally mirror `login_failed`/`oauth_callback_error` counts into `product_events` for funnel views.

**Out of scope** — ANY behavioral change to auth flows, redirects, or cookie handling; new auth tables; middleware changes (RFC-009 handles middleware — coordinate, don't overlap).

**Files likely affected** — `src/app/auth/callback/route.ts`, `src/app/api/auth/signup/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/lib/supabase/middleware.ts` (log-only lines in `updateSession`), `src/lib/auth/password-reset.ts`.

**DB migrations** — None. **API changes** — None. **Frontend changes** — None.

**Testing strategy** — `e2e/auth/*` in **both** `NEXT_PUBLIC_AUTH_V2` states (house rule); unit tests for event emission points where the files already have test coverage; manual signed-in/signed-out/expired-session walk per the auth invariant checklist.

**Rollback strategy** — Revert deploy.

**Deployment order** — After RFC-005. Before or after RFC-006/007 (no ordering constraint between adoptions).

**Risk Level** — Medium (log-only lines, but in auth-critical files touched under a dual-path flag).

**Expected engineering time** — Medium.

---

## RFC-009 — Platform-wide request ID (middleware)

**Why** — No platform-wide request ID exists; the middleware already proves the minting pattern in its 429 path, and four routes prove the per-route pattern. Correlation (client ↔ server ↔ DB rows) needs the ID minted once, centrally. (OBSERVABILITY.md §4.2.)

**Scope** — In `middleware.ts`: mint a short UUID per non-static request (or adopt an inbound `x-request-id` if present from Vercel), forward it to the route via request headers, and echo it on the response as `X-Request-Id`. Nothing reads it yet — this RFC only makes the ID exist everywhere.

**Out of scope** — Route adoption (RFC-010); client headers (RFC-011); DB columns (RFC-010); logging route durations (RFC-013); any change to redirects, rate limiting, auth gating, or the matcher.

**Files likely affected** — `middleware.ts` only.

**DB migrations** — None. **API changes** — Response gains an `X-Request-Id` header platform-wide (purely additive). **Frontend changes** — None.

**Testing strategy** — Full e2e suite (middleware is on every request; this is the gate). Unit-testable helper for mint/adopt logic. Manual: verify redirect chains (www→apex, login redirects) still carry correct status codes; verify bot-bypass path unaffected; verify both AUTH_V2 states. Confirm header propagation works on the deployed runtime (edge) — **verify in preview deploy, not just locally**.

**Rollback strategy** — Revert deploy. Header disappears; RFC-010+ code must treat the header as optional (nullable requestId) so rollback of 009 alone never breaks them.

**Deployment order** — Before RFC-010/011. After the adoption RFCs is also *possible* but pointless — do it in this order.

**Risk Level** — **High** — the diff is small but the blast radius is every request in production, including SEO-sensitive redirect behavior (Critical Invariant #7 lives partly in this file). Mitigate with preview-deploy soak + full e2e.

**Expected engineering time** — Medium (small diff, large verification).

---

## RFC-010 — Request-ID adoption in high-risk routes + `request_id` telemetry columns

**Why** — The ID from RFC-009 is only useful once routes log it and telemetry rows carry it; that's what makes MCP `traceRequest` possible. (OBSERVABILITY.md §4.2 steps 2 & 4.)

**Scope** — (a) Additive migration: nullable `request_id text` on `ai_call_logs`, `voice_usage_logs`, `product_events`. (b) `getRequestId(request)` helper. (c) Thread it through the highest-value routes first — interview group, payments group, resume group, stt/tts — into logger calls and into `logAICall`/`logTTSCall`/`logSTTSession`/`persistProductEventAsync` params (new optional field, default null). Resume upload keeps its own minting as fallback when the header is absent.

**Out of scope** — Remaining ~20 route groups (mechanical follow-ups, not RFC-worthy); AsyncLocalStorage context (explicit param passing per house style).

**Files likely affected** — New migration; `src/lib/telemetry/ai-logger.ts`, `src/lib/telemetry/voice-logger.ts`, `src/lib/analytics/product-events-store.ts`; route files in `src/app/api/{interview,payments,resume,stt,tts}/`; new `src/lib/observability/request-id.ts`.

**DB migrations** — Yes — one, additive, nullable columns only.

**API changes** — None externally.

**Frontend changes** — None.

**Testing strategy** — Unit: writers accept + persist request_id, tolerate null. Suites: razorpay, interview, `verify:pdf` untouched-behavior checks. Manual: one dev interview → confirm `ai_call_logs.request_id` populated and joins to response header value.

**Rollback strategy** — Revert deploy (columns go back to null — harmless). Migration stays.

**Deployment order** — After RFC-009. Migration can ship any time before the code.

**Risk Level** — Medium (breadth: many files, each a trivial diff; the writers are fire-and-forget so mistakes can't block user paths).

**Expected engineering time** — Large.

---

## RFC-011 — Client correlation headers

**Why** — Joins browser-side telemetry (runId) and interview context to server requests, closing the client↔server correlation loop. (OBSERVABILITY.md §4.2 step 3.)

**Scope** — Attach `x-client-run-id` (from `getInterviewTelemetryRunId()`) and, during a session, `x-interview-id` to interview-session API calls made through the session page's fetch layer (`src/lib/api.ts` per the Interview Resilience work — verify current fetch wrapper location first). Middleware/routes log them when present (nullable).

**Out of scope** — Beacon payloads (already carry runId/interviewId); non-interview pages; any CSP/CORS change (same-origin custom headers on fetch need no CSP change; verify no `Access-Control-Allow-Headers` assumptions in `/api/product-events` OPTIONS handler).

**Files likely affected** — Client fetch wrapper (verify: `src/lib/api.ts` or equivalent under `src/lib/client/`), `src/lib/observability/request-id.ts` (read helpers).

**DB migrations** — None. **API changes** — None. **Frontend changes** — Header-only addition in the fetch layer.

**Testing strategy** — Unit test on the fetch wrapper (headers present when session context exists, absent otherwise); one e2e interview spec assertion; manual mobile smoke is NOT required (header addition is not a voice-pipeline change) but run one desktop session manually.

**Rollback strategy** — Revert deploy; server treats missing headers as null.

**Deployment order** — After RFC-009 (needs somewhere to correlate *to*); independent of RFC-010.

**Risk Level** — Low.

**Expected engineering time** — Small.

---

## RFC-012 — AI telemetry emit-path consolidation

**Why** — Three overlapping AI emit paths (`emitAiTelemetry` stdout, `structured-ai-log` stdout, `ai-logger` DB) have drifting vocabularies; a single fan-out wrapper in the shared retry core removes drift and guarantees every LLM call is logged identically. (OBSERVABILITY.md §2 "Needs improvement".)

**Scope** — One internal wrapper in/next to `src/lib/ai/chat-completion-core.ts` that, per attempt/outcome, fans out to: unified logger line (subsystem `ai`), `emitAiTelemetry` events, and `logAICall` DB write. Callers (`evaluate-answer`, `generate-questions`, `agent-evaluator`, `followup-generator`, `parse-resume`) stop calling loggers directly where the core now covers them. Keep `[ai-completion]` line format during a deprecation window (emit both) to preserve grep continuity.

**Out of scope** — Any retry/timeout/routing behavior change; provider-intelligence scoring; cost-guard logic; removing legacy emitters (only after a soak period, separate cleanup).

**Files likely affected** — `src/lib/ai/chat-completion-core.ts`, `src/lib/ai/interview-completion.ts`, `src/lib/openai/{evaluate-answer,generate-questions,parse-resume}.ts`, `src/lib/interview/{agent-evaluator,followup-generator}.ts`, `src/lib/telemetry/structured-ai-log.ts`.

**DB migrations** — None. **API changes** — None. **Frontend changes** — None.

**Testing strategy** — Existing AI-path unit tests must pass; new unit tests on the wrapper (success/failure/timeout each produce exactly one DB write + expected lines); manual dev interview confirming `ai_call_logs` row parity (same fields populated as before).

**Rollback strategy** — Revert deploy; old direct-call pattern returns.

**Deployment order** — After RFC-004 (uses the logger); before RFC-015's AI panels ideally. Independent of correlation RFCs but pairs well after RFC-010 (wrapper is the natural place to inject request_id).

**Risk Level** — Medium — touches the shared LLM core used by evaluation (Critical Invariant #4 adjacency). The invariant lives in *callers'* fallback logic, which this RFC must not touch.

**Expected engineering time** — Large.

---

## RFC-013 — Rate-limit and route-duration metrics

**Why** — Rate-limit allow/deny outcomes and per-route latency are invisible today; a 429 storm or a latency regression is only discoverable by log grep. (OBSERVABILITY.md §1.7, §6.)

**Scope** — (a) In `checkRateLimit` (or a thin wrapper), count outcomes per path-prefix bucket in Redis (INCR on daily keys, fire-and-forget, fail-silent). (b) In middleware, emit a single sampled `http_request` log line (path group, status class, durationMs, requestId) — sampled (e.g. 1–10%) to bound volume, always-on for 4xx/5xx.

**Out of scope** — Changing any limit values or fail-open/closed policies; dashboards (RFC-015); per-user metrics.

**Files likely affected** — `src/lib/redis/rate-limit.ts`, `middleware.ts` (one log line — coordinate with RFC-009's diff), small new `src/lib/observability/http-metrics.ts`.

**DB migrations** — None (Redis counters). **API changes** — None. **Frontend changes** — None.

**Testing strategy** — Unit: counters increment on allow/deny, silent on Redis failure (both fail-open and fail-closed paths unchanged — assert return values byte-identical); e2e smoke since middleware is touched.

**Rollback strategy** — Revert deploy; counters simply stop.

**Deployment order** — After RFC-009 (middleware line reuses its requestId; merging both middleware diffs in one window reduces double-risk exposure).

**Risk Level** — Medium (middleware again, but log/INCR-only).

**Expected engineering time** — Medium.

---

## RFC-014 — Telemetry retention pruning cron

**Why** — `ai_call_logs`, `voice_usage_logs`, `product_events`, and (post-RFC-005) `app_error_events` grow unboundedly; no retention policy exists in the repo. The observability system must not become its own incident. (OBSERVABILITY.md §5 Database, P2.)

**Scope** — New cron route (CRON_SECRET-gated, same pattern as `daily-rollup`) deleting rows older than per-table retention windows (proposal: raw `ai_call_logs`/`voice_usage_logs` 180d — rollups keep the history; `app_error_events` 90d; `client_telemetry`-stream product_events 90d; **funnel product_events exempt** — founder analytics needs history). Batched deletes with a row cap per run. Also: decide `realtime_session_metrics` (dead table, no writer) — recommend documenting as deprecated in this RFC and dropping in a far-future migration only with explicit sign-off (destructive migrations need a stated rollback plan + confirmation per house rules).

**Out of scope** — Archival/export to cold storage; changing rollup logic.

**Files likely affected** — New `src/app/api/cron/telemetry-prune/route.ts`; `vercel.json` (cron entry); possibly a migration adding the delete indexes if missing (023 has created_at indexes — verify).

**DB migrations** — Possibly one additive index migration.

**API changes** — New cron endpoint (secret-gated). **Frontend changes** — None.

**Testing strategy** — Unit: date-window math, batch cap, table exemptions (funnel events never deleted — write an explicit test for this); manual dry-run mode (`?dryRun=1`) returning would-delete counts before first real run.

**Rollback strategy** — Remove cron entry / revert deploy. Deleted rows are gone — retention windows are deliberately conservative and the dry-run gate is mandatory on first prod run.

**Deployment order** — Any time after RFC-001 (once telemetry volume starts growing). Before the MCP goes heavy-use.

**Risk Level** — Medium — it deletes production data by design; the funnel-exemption test and dry-run mode are the guardrails (Analytics is a High Risk System: founder dashboard depends on `product_events`).

**Expected engineering time** — Medium.

---

## RFC-015 — Ops dashboard: new admin metrics sections

**Why** — Surfaces what Phases 1–4 made queryable: speech success rate, resume extraction success, payment activation success, error rates by errorCode/release, rate-limit pressure. Extends the existing admin surface rather than building a new one. (OBSERVABILITY.md §6.)

**Scope** — New sections in `/api/admin/metrics` (or sibling routes) reading `product_events` (client_telemetry + payment + resume streams), `app_error_events`, and Redis rate-limit counters; UI panels in the existing platform/admin pages using the established `useAdminStats`/cache patterns. All read-only, admin-gated (`requirePlatformAdmin`), cached 60–120s.

**Out of scope** — Alerting; public status page; real-time streaming; slow-query panel (**Unknown — no in-repo data source**).

**Files likely affected** — `src/app/api/admin/metrics/route.ts` (or new `src/app/api/admin/observability/route.ts`), `src/app/platform/**` or `src/app/admin/**` pages, `src/hooks/useAdminStats.ts`.

**DB migrations** — None (reads only). Consider SQL views in a migration if queries get heavy.

**API changes** — New admin-gated read endpoints/sections. **Frontend changes** — New admin panels (client components acceptable here — admin dashboard, not SEO surface).

**Testing strategy** — Unit tests on aggregation functions with fixture rows; authz test (non-admin → 403); manual admin smoke.

**Rollback strategy** — Revert deploy; read-only feature.

**Deployment order** — After RFC-001/002/003/005 (needs their data). RFC-013 counters optional (panel degrades gracefully if absent).

**Risk Level** — Low (read-only, admin-gated).

**Expected engineering time** — Large.

---

## RFC-016 — Read-only observability DB role

**Why** — The MCP must never hold the service-role key; a scoped Postgres role with SELECT on telemetry tables only is the security boundary that makes RFC-017 safe to run anywhere. (OBSERVABILITY.md §7 security invariants; aligns with Critical Invariants #2/#3 — no widening of write paths.)

**Scope** — Migration creating role `observability_reader` (login via a dedicated connection string or PostgREST-mapped role — decide during implementation against Supabase's supported patterns; **verify Supabase custom-role + API-key story before committing to mechanism**) with SELECT-only on: `ai_call_logs`, `voice_usage_logs`, `provider_health_logs`, `provider_failover_events`, `user_ai_usage_rollups`, `abuse_detection_logs`, `product_events`, `app_error_events`. Explicitly NO access to `users`, `resumes`, `answers`, `payments`, `credit_transactions`.

**Out of scope** — The MCP itself; any write grant; any RLS change on existing tables.

**Files likely affected** — New migration; `.env.example` (new connection env var, server-only).

**DB migrations** — Yes — one, additive (role + grants).

**API changes** — None. **Frontend changes** — None.

**Testing strategy** — SQL-level verification in a Supabase branch/staging: role can SELECT telemetry tables, gets `permission denied` on `users`/`payments`/INSERT anywhere. Document the checks in the migration comments (033-lesson: grants are where silent failures hide).

**Rollback strategy** — Revoke grants / drop role in a follow-up migration if abandoned (roles are cheap; nothing depends on it until RFC-017).

**Deployment order** — Any time; required before RFC-017 ships.

**Risk Level** — Low–Medium (pure DB change; risk is misunderstanding Supabase role mechanics — hence the staging verification).

**Expected engineering time** — Medium.

---

## RFC-017 — Production Logs MCP server

**Why** — The end deliverable: intelligent debugging over production telemetry from the editor/agent. Only rational to build once RFC-001/005/009/010 give its tools real data. (OBSERVABILITY.md §7.)

**Scope** — Standalone stdio MCP server in `mcp/production-logs/` (own package.json, not in the Next.js bundle): 12 read-only tools (`searchLogs`, `traceRequest`, `traceInterview`, `traceResume`, `traceSpeech`, `tracePayment`, `traceLLM`, `traceUser`, `recentFailures`, `systemHealth`, `providerHealth`, `summarizeErrors`) per the spec in OBSERVABILITY.md §7, using the RFC-016 role; optional `VERCEL_TOKEN`-gated log tailing as secondary plane; boundary redaction + row caps + default time windows on every tool.

**Out of scope** — Write operations of any kind; alerting; hosting it as a shared service (local/stdio first); the email→userId resolver tool (defer — deliberate, audited addition later).

**Files likely affected** — New directory `mcp/production-logs/**`; root README pointer; `.env.example` note.

**DB migrations** — None (RFC-016 already landed).

**API changes** — None to the app. New MCP tool surface (external).

**Frontend changes** — None.

**Testing strategy** — Unit tests per tool against a fixture DB (seeded rows for each table); redaction tests (inject a fake secret-shaped prop, assert masked); cap/window tests; an integration smoke against staging Supabase. Manual: run each tool against production data for one known interview/payment and validate the timeline reads true.

**Rollback strategy** — It's an external read-only process — stop running it. Zero production coupling.

**Deployment order** — Last. Hard deps: RFC-005, RFC-016. Value deps (tools degrade without them): RFC-001, 002, 009, 010.

**Risk Level** — Low (read-only, out-of-band) — provided RFC-016's role scoping is verified.

**Expected engineering time** — XL.

---

## Prioritization

Scored on Business Impact (debugging/revenue protection value), Engineering Risk (chance of hurting prod), Implementation Complexity.

| RFC | Title | Impact | Eng. Risk | Complexity | Priority |
|---|---|---|---|---|---|
| 001 | Persist client beacons | **High** (mobile voice debugging — top pain) | Low | Medium | **P0** |
| 002 | Durable payment events | **High** (incident-class protection) | Medium | Small | **P0** |
| 004 | Unified logger module | High (unblocks everything) | Low | Medium | **P0** |
| 005 | app_error_events | High (durable errors; MCP plane) | Low–Med | Medium | **P0** |
| 006 | Interview routes adoption | High (invariant #4 visibility) | Medium | Medium | **P1** |
| 009 | Middleware request ID | High (correlation spine) | **High** | Medium | **P1** (gate: preview soak) |
| 010 | Request-ID adoption + columns | High | Medium | Large | **P1** |
| 003 | Resume outcome telemetry | Medium–High (funnel insight) | Low–Med | Medium | **P1** |
| 008 | Auth telemetry | Medium–High (V2 rollout safety) | Medium | Medium | **P1** |
| 007 | Payment logger adoption | Medium | Medium | Small | **P2** |
| 011 | Client correlation headers | Medium | Low | Small | **P2** |
| 013 | Rate-limit/duration metrics | Medium | Medium | Medium | **P2** |
| 012 | AI emit consolidation | Medium (hygiene > new signal) | Medium | Large | **P2** |
| 014 | Retention pruning | Medium (grows with time) | Medium | Medium | **P2** |
| 015 | Ops dashboard | Medium–High (founder-facing) | Low | Large | **P2** |
| 016 | Read-only DB role | Enabler | Low–Med | Medium | **P2** |
| 017 | Production Logs MCP | **High** (the goal) | Low | XL | **P3** (by dependency, not value) |

## Dependency graph

```
Independent starters (parallelizable):
  RFC-001  RFC-002  RFC-003  RFC-004  RFC-016

RFC-004 ──► RFC-005 ──► RFC-006
                    ├──► RFC-007   (also after RFC-002)
                    ├──► RFC-008
                    └──► RFC-015   (also after RFC-001/002/003)

RFC-009 ──► RFC-010 ──► RFC-012 (soft: wrapper injects request_id)
        ├──► RFC-011
        └──► RFC-013 (middleware diff coordination)

RFC-001 ──► RFC-014 (prune once volume exists)

MCP:  RFC-005 + RFC-016 (hard)  ┐
      RFC-001/002/009/010 (value)┴──► RFC-017
```

**Suggested execution waves**
1. **Wave 1 (durability):** 001 → 002 → 003, with 004 in parallel. *Everything here is additive fire-and-forget.*
2. **Wave 2 (structure):** 005 → 006 → 008 → 007.
3. **Wave 3 (correlation):** 009 (preview soak) → 010 + 011 + 013.
4. **Wave 4 (hygiene + surface):** 012, 014, 015, 016.
5. **Wave 5 (deliverable):** 017.

*Backlog prepared 2026-07-05 from docs/OBSERVABILITY.md; re-verify file paths at pickup time — the voice subsystem and interview session page have active uncommitted changes in the working tree.*
