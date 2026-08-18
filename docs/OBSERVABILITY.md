# Observability — InterviewEra

**Status: DESIGN — nothing in this document is implemented beyond what the Audit section marks as existing.**
Architecture and design for a production-grade observability system, culminating in a Production Logs MCP. Every claim in the Audit and Gap Analysis sections is verified from the repository; anything unverifiable is marked **Unknown — not found in repository**.

---

## 1. Observability Audit (current state, verified)

### 1.1 Logging system

There is **no unified logger**. Logging is structured-but-fragmented console logging: **436 `console.*` occurrences across 155 files** (grep, 2026-07-05), organized into ~15 prefix families plus ad-hoc route-local prefixes:

| Prefix family | File | Transport | Notes |
|---|---|---|---|
| `[payment:*]` | `src/lib/razorpay/payment-log.ts` | console, JSON line | order_id/payment_id/user_id trace ids; scopes: create-order/checkout/verify/webhook/activate/expiry |
| `[TYPE] event {json}` (client) | `src/lib/telemetry/interview-telemetry.ts` | console + beacon | Mandatory fields: interviewId, questionIndex, phase, platform, browser, pwa, timestamp, ts, runId, sessionElapsedMs |
| `[client-telemetry]` | `src/app/api/product-events/route.ts` | console only | Server sink for critical client beacons; adds `serverTs`; **not persisted to DB** |
| raw JSON line (no prefix) | `src/lib/observability/ai-telemetry.ts` | console | 11 typed AI events (`ai_request_start/success/failure/timeout`, `ai_cost_estimate`, …), scalar-only, no PII |
| `[ai-completion]` | `src/lib/telemetry/structured-ai-log.ts` | console, JSON | OpenRouter completion outcome per call |
| `[prepare]` | `src/lib/telemetry/prepare-server-span.ts` | console, JSON | The only server "span" implementation; interview_id + duration_ms |
| `[<scope>:lifecycle]`, `[VOICE_DEBUG]`, `[interview-startup]`, `[VOICE]`, `[INTERVIEW]`, `[mic-flow]` | `src/lib/voice/lifecycle-log.ts` | console | `VOICE_DEBUG` is prod-gated behind `localStorage.VOICE_DEBUG='1'` |
| `[VOICE_PIPELINE]` | `src/lib/voice/voice-pipeline-diagnostics.ts` | console | Rule-based failure classifier (`ZERO_PCM`, `WS_NOT_CONNECTED`, … 15 classes) + full pipeline snapshot |
| `[voice:<scope>]` | `src/lib/voice/core/observability.ts` | console (pluggable sink) | **v2 architecture, not wired to production** — already carries interviewId/sessionId/turnId/correlationId |
| `[ai-logger]`, `[voice-logger]` | `src/lib/telemetry/{ai,voice}-logger.ts` | error-path console | DB writers (see 1.2) |
| `[rate-limit]`, `[product-events-store]`, `[auth/callback]`, `[interview/answer]`, `[admin/funnel]`, … | route/lib-local | console | Ad-hoc; no shared shape, no ids beyond what each call site includes |

**No third-party log/APM stack**: no Sentry, Datadog, pino, winston, OpenTelemetry, or traceparent anywhere in `src/` or `package.json` (grep-verified). Server logs live only in Vercel's log stream. No log-drain configuration exists in the repo (`vercel.json` has none; drains are dashboard-level). **Log retention: Unknown — not found in repository** (depends on Vercel plan; hobby/pro retention is short).

### 1.2 Telemetry tables (DB-backed, durable)

Migration `023_ai_telemetry.sql` (+ grants fix in `033`) creates seven tables:

| Table | Writer | Status |
|---|---|---|
| `ai_call_logs` | `src/lib/telemetry/ai-logger.ts::logAICall` (fire-and-forget) | Active — per-LLM-call: operation, provider, model, tokens, cost_usd, latency, retries, success, error_category, interview_id, user_id |
| `voice_usage_logs` | `src/lib/telemetry/voice-logger.ts::logTTSCall/logSTTSession` | Active — TTS chars/STT duration, cost, latency, interview_id |
| `provider_health_logs` | `src/app/api/cron/health-snapshot/route.ts` (hourly cron) | Active — success_rate, p95, timeout/quota rates, circuit state per provider |
| `provider_failover_events` | `ai-logger.ts::logProviderFailover` | Active (fallback currently disabled platform-wide, so rare) |
| `user_ai_usage_rollups` | `compute_daily_user_rollup()` PL/pgSQL via `daily-rollup` cron (00:05 UTC) | Active |
| `abuse_detection_logs` | `src/lib/abuse/risk-scorer.ts` | Active |
| `realtime_session_metrics` | **No writer found in `src/`** | **Dead table** — schema exists, nothing writes it |

Plus `product_events` / `experiment_assignments` (migration 051, service-role-write-only), written by `src/lib/analytics/product-events-store.ts::persistProductEventAsync` (sanitized: ≤32 prop keys, ≤500-char strings, user_id extracted).

### 1.3 Analytics

`src/lib/analytics/` (23 files): funnel tracking (`funnel.ts` → GA4 bridge + `product_events`), attribution, dedupe, experiments, CTA tracking, resume analytics, page-view. GA4 is explicitly a client-side **backup**; server-side `product_events` inserts are authoritative (`funnel-ga4-bridge.ts` comment, `docs/SEO.md`). GA4 + Clarity + Vercel Analytics load client-side.

### 1.4 Request IDs / correlation IDs

- **No platform-wide request ID.** `middleware.ts` mints a `requestId` **only** inside the 429 rate-limit response (line ~190).
- Full per-route request-ID pattern (mint UUID → `X-Request-Id` header + `requestId` in every JSON body) exists in exactly a handful of routes: `api/resume/upload` (exemplary implementation, `withReqId`/`jsonWithReq` helpers), `api/job-description/extract`, `api/auth/forgot-password`, `api/debug/storage-upload`. The client reads it back in `src/lib/client/fetch-multipart-json.ts`.
- **Business correlators** are the real spine today: `interviewId` (client telemetry contract + `ai_call_logs.interview_id` + `voice_usage_logs.interview_id`), `paymentId/orderId/userId` (payment logs), `runId` (per-page-load, client only).
- The v2 voice module `src/lib/voice/core/observability.ts` + `core/ids.ts` already defines `sessionId/turnId/correlationId` — designed but not in the production path.

### 1.5 Error handling / error telemetry

Typed error classes per domain (`PDFEncryptedError`, `QuotaExhaustedError`, `FallbackDisabledError`); degrade-don't-fail is the house style. Client has one `ErrorBoundary.tsx` (console only). **No global client error reporter, no server error aggregation** — errors are console lines in Vercel logs.

### 1.6 Metrics / tracing

- Metrics: DB tables above + in-process `provider-intelligence.ts` (resets on cold start — documented as expected) + in-memory client voice metrics (`mic-pipeline-telemetry.ts` percentiles).
- Tracing: none. `prepare-server-span.ts` is the only duration-span primitive. No OTel, no trace propagation.

### 1.7 Rate limiting observability

`src/lib/redis/rate-limit.ts` logs Redis failures (`[rate-limit]`) and distinguishes fail-open/fail-closed, but **allowed/denied counts are not recorded anywhere queryable** — a 429 storm is invisible unless you grep Vercel logs.

### 1.8 Per-subsystem summary

| Subsystem | Exists | Missing | Duplicated / to standardize |
|---|---|---|---|
| AI/LLM | Best-covered: `ai_call_logs` DB + `[ai-completion]` + raw-JSON stdout events + hourly health snapshots + cost engine + cost guard | request-scoped correlation (no requestId on `ai_call_logs`; `session_id` column exists but writer passes it inconsistently) | **Three overlapping emit paths** (`emitAiTelemetry` stdout, `structured-ai-log` stdout, `ai-logger` DB) with different field names (`latency_ms` everywhere but different event vocabularies) |
| Voice (client) | Rich: telemetry contract, failure classifier, device/permission monitors, critical-event beacons | Beacons stop at console (`[client-telemetry]`) — not queryable; no per-interview voice health rollup in DB | Legacy prefixes (`[VOICE]`, `[mic-flow]`, `[interview-startup]`) still emitted alongside `interviewTelemetry`; v2 `core/observability.ts` unwired |
| Voice (server) | `voice_usage_logs` on TTS/STT routes; ElevenLabs health check (`elevenlabs-health.ts`) | Deepgram provider health (no equivalent of ElevenLabs check); STT lease/quota events are console-only | — |
| Payments | `[payment:*]` structured logs with trace ids; 11 concurrency tests | Not persisted to DB — payment debugging = Vercel log grep within retention window; no payment-events timeline per user | — |
| Resume/PDF | requestId pattern (best in repo), `parse-pipeline-timing.ts`, resume-analytics client+server, typed PDF errors | requestId not carried from upload → parse → AI parse (parse is a separate request); no durable extraction-quality metrics table | — |
| Auth | Ad-hoc console (`[auth/callback]`, signup route) | No structured auth telemetry at all: no login-failure rate, OAuth-callback error rate, session-refresh failure visibility. V2 flag state not logged | — |
| Interview engine | `interviewTelemetry` client contract; `[prepare]` server spans; `[interview/answer]` console; evaluation fallbacks logged | Server routes don't share the client's event schema; no requestId; `answers`→`evaluations` failure only visible as console lines | `[interview/answer]` 12 raw console calls should route through one emitter |
| SEO | Build-gated `noindex-audit` (strongest guarantee in repo) | Runtime crawl/index telemetry (Unknown — GSC is external) | — |
| Analytics | `product_events` durable + GA4 backup + dedupe | Client *telemetry* beacons and *product* events use the same endpoint name but only product events persist — confusing split | Endpoint semantics need one contract |
| Database | RLS everywhere; `admin/system` DB ping | **Slow-query telemetry: Unknown — not found in repository** (no pg_stat_statements usage in code; Supabase dashboard is external) | — |
| Deployment | CI gates; `/api/health` | No release marker in logs (no commit SHA/env stamped on log lines); log drain absent | — |
| Health/dashboards | `/api/health`, `/api/admin/system` (DB/Redis/ElevenLabs/AI), `/api/admin/metrics` (overview/finance/providers/users/abuse), `/api/admin/funnel`, platform pages | Speech success rate, resume success rate, payment success rate, error rates, latency percentiles per route — none surfaced | — |

---

## 2. Gap Analysis (repo vs. target)

**Already exists (keep, don't rewrite)**
- DB telemetry plane: `ai_call_logs`, `voice_usage_logs`, `provider_health_logs`, rollups, crons, `admin/metrics` API — this is a real foundation.
- Client interview telemetry contract (`interview-telemetry.ts`) — the mandatory-field design is exactly right; extend, don't replace.
- Payment structured logs with trace ids.
- Resume-upload requestId pattern — the template to generalize.
- `voice/core/observability.ts` correlation vocabulary (interviewId/sessionId/turnId/correlationId) — design already done, unwired.

**Needs improvement**
- Request-ID coverage: 4 routes → all ~30 API groups (P0).
- Client beacons: console-only → persist critical telemetry events durably (P0).
- Three AI emit paths → one wrapper that fans out to stdout + DB (P1).
- Legacy voice prefixes still live alongside the unified system (P2, cleanup).
- Rate-limit outcomes → counted somewhere queryable (P1).

**Missing completely**
- Unified server logger with mandatory field contract (P0).
- Correlation propagation middleware → route → lib → DB rows (P0).
- Auth telemetry (P1).
- Log durability beyond Vercel retention: log drain or DB persistence for error-level lines (P1).
- Error-rate / latency metrics per route (P1).
- Deployment/release stamping (env + commit SHA on every log line) (P1, cheap).
- Slow-query visibility (P3 — external Supabase tooling may already cover; **Unknown**).

**Technical debt (log it, don't fix inline)**
- `realtime_session_metrics`: dead table — decide write-or-drop. *Worth scheduling.*
- `ai_call_logs.session_id/ip/user_agent` columns inconsistently populated. *Cosmetic-to-worth-scheduling.*
- `docs/ARCHITECTURE.md` cites `docs/FINAL_PRODUCTION_CERTIFICATION.md` and `docs/SEO-INFRASTRUCTURE.md`, which are deleted in the current working tree — doc links will dangle. *Cosmetic.*

---

## 3. Logging Architecture (target design)

### 3.1 One interface, additive adoption

A single server logger module (proposed: `src/lib/observability/logger.ts`) that **wraps console** (Vercel captures stdout — no transport change, zero risk to production behavior). Existing emitters (`payment-log`, `ai-logger`, etc.) are migrated to call it *internally*, keeping their public APIs and prefixes so no call site or grep workflow breaks.

### 3.2 Log event contract

Every line: `[service:subsystem] event {json}` where the JSON envelope is:

```
ts            ISO-8601 (auto)
level         debug | info | warn | error (auto from method)
service       "web" (single deployable today; future-proofs the field)
subsystem     payment | ai | voice | resume | auth | interview | analytics | http | cron | redis
event         snake_case stable name
env           production | preview | development (from VERCEL_ENV; auto)
release       commit SHA (from VERCEL_GIT_COMMIT_SHA; auto)
requestId     from request context (auto when available)
userId        when available
interviewId   when available
resumeId      when available
paymentId     when available
provider      openrouter | deepgram | elevenlabs | razorpay | resend | supabase | upstash (when relevant)
durationMs    when the event closes a span
errorCode     stable machine code (when level ≥ warn)
...data       event-specific scalars
```

### 3.3 Redaction (enforced in the logger, not by convention)

- Denylist of key patterns dropped/masked at emit time: `*token*`, `*secret*`, `*key*` (except `*_id` false-positives), `authorization`, `cookie`, `signature`, `password`, `email` (mask to `r***@domain`), raw prompt/answer/resume text.
- Follows existing precedent: `payment-log.ts` ("Never log secrets, full key IDs, or webhook signatures"), `ai-telemetry.ts` ("No PII: prompts, answers, and names are never included"), `voice-logger.ts` (voice_id truncated to 8 chars). The logger makes the convention mechanical.
- userId/interviewId are UUIDs — loggable. Never log free-text user content.

### 3.4 Levels & routing

- `error` → also persisted durably (see 3.5). `warn` → console (+ sampled persistence). `info` → console. `debug` → dev/preview only, prod behind an opt-in env flag (same pattern as `VOICE_DEBUG`).

### 3.5 Durability

Vercel console retention is the weakest link. Two additive options, in preference order:

1. **`app_error_events` table** (new migration, additive, service-role-only writes like `product_events`): every `error`-level server log fire-and-forgets an insert (same non-blocking pattern as `persistProductEventAsync`). Bounded by sanitization + a per-instance token bucket to prevent write storms.
2. Vercel Log Drain to an external store — **dashboard config, not repo config**; decide separately (cost).

The MCP (section 6) reads the DB plane, so option 1 is the enabler.

---

## 4. Correlation Strategy

### 4.1 ID taxonomy

| ID | Minted by | Scope | Exists today? |
|---|---|---|---|
| `requestId` | middleware (edge), UUID v4 short | one HTTP request | Only 4 routes + 429s |
| `clientRunId` | `interview-telemetry.ts` RUN_ID | one page load | ✅ exists |
| `interviewId` | DB row | whole interview, cross-request | ✅ exists, best correlator |
| `resumeId` | DB row | upload → parse → interview start | ✅ exists |
| `paymentId`/`orderId` | Razorpay | checkout → verify/webhook → activation | ✅ exists |
| `userId` | Supabase auth | everything | ✅ exists |
| `turnId`/`correlationId` (voice) | `voice/core/ids.ts` | one question/answer turn | designed, unwired |

### 4.2 Propagation design (additive)

1. **Middleware** mints `requestId` for every non-static request and sets it as a **request header** (`x-request-id`) forwarded to the route + echoed on the response. (Next.js middleware can rewrite request headers; the existing 429 path already proves the minting pattern.)
2. **Route handlers** read `request.headers.get('x-request-id')` via a tiny helper (`getRequestId(request)`) and pass it to the logger context. No AsyncLocalStorage required initially — explicit parameter passing matches the codebase's current style; ALS is a later refinement.
3. **Client** attaches `x-client-run-id` and (when in an interview) `x-interview-id` headers on `api.ts`-managed fetches; middleware/routes log them. Client telemetry events already carry `runId` — this joins browser events to server requests.
4. **DB rows**: add nullable `request_id` columns (additive migrations) to `ai_call_logs`, `voice_usage_logs`, `product_events` so one request's LLM calls, voice usage, and events join by ID.
5. **External providers**: log provider-side ids where responses include them (Razorpay ids already logged; Deepgram request id, OpenRouter generation id, ElevenLabs history id — capture into the same envelope when available).

### 4.3 End-to-end trace of one interview session

```
Browser (runId R, interviewId I)
  │  x-client-run-id: R, x-interview-id: I
  ▼
middleware — mints requestId Q per request → logs http_request {Q,R,I,userId}
  ▼
/api/interview/start — logs with {Q,I,userId}
  └─ create_interview_with_credit  → credit_transactions {user_id, interview_id: I}
/api/interview/answer — logs with {Q,I,userId}
  ├─ evaluate-answer → OpenRouter  → ai_call_logs {interview_id: I, request_id: Q}
  ├─ evaluations insert            → row keyed by answer→question→I
  └─ product_events                → {request_id: Q, user_id, props.interviewId: I}
/api/stt/token — voice_usage_logs {interview_id: I, request_id: Q'}
/api/tts       — voice_usage_logs {interview_id: I, request_id: Q''}
/api/payments/verify + webhook     → [payment:*] logs {order_id, payment_id, user_id}
                                     (correlate to user via userId; to session via time+userId)
Client critical beacons            → /api/product-events {runId R, interviewId I}
                                     → persisted (Phase 1 roadmap) → joins everything above on I
```

`interviewId` is the cross-request spine; `requestId` is the intra-request thread; `runId` joins client-side context. Payments correlate on `userId` + `paymentId` (payment flows are not interview-scoped).

---

## 5. High-Risk Systems — independent audits

| System | Current observability | Missing | Recommended | Priority | Debugging benefit |
|---|---|---|---|---|---|
| **Speech** | Strongest client telemetry in repo: failure classifier (15 classes), critical beacons, `voice_usage_logs`, ElevenLabs health | Beacons not queryable (console only); no Deepgram health probe; no per-interview voice success rollup | Persist critical voice beacons; add `voice_session_summaries` view or rollup from persisted events; Deepgram health in `admin/system` | **P0** | "Did mic capture fail for this user's interview, and why" becomes a query, not a log grep within retention |
| **Resume parsing** | Best requestId pattern; timing module; typed errors; `verify:pdf` regression gate | requestId dropped between upload and parse requests; extraction-quality scores not persisted | Carry `resumeId` in parse logs (it exists — verify coverage); persist per-resume extraction outcome (method used: pdfjs/pdf-parse/OCR/fallback, chars, quality score) into `product_events` props | **P1** | Funnel-critical: quantifies which extraction layer saves/loses users |
| **Interview engine** | Client contract solid; `[prepare]` spans; fallback evaluations logged | Server routes lack requestId + unified emitter; orchestrator state failures are console-only | Route `[interview/answer]`'s 12 console calls through the unified logger with `{requestId, interviewId, questionIndex}` | **P0** | Null-score invariant (#4) violations become traceable to a specific failed insert |
| **AI providers** | Excellent: `ai_call_logs` + health snapshots + cost engine + intelligence routing | `request_id` absent on rows; three emit paths drift | Consolidate to one wrapper in `chat-completion-core.ts` fanning out to stdout + DB | **P1** | Single query answers "which operation/model degraded at time T" |
| **Payments** | `[payment:*]` with trace ids; idempotency invariant tested | Console-only — an activation incident older than log retention is unreconstructable from logs (DB rows remain) | Mirror `activationLog`/`activationError` into `product_events` (props: order_id, payment_id, outcome) — additive, no behavior change | **P0** | The next `pay_T1Xu…`-class incident is diagnosable months later |
| **Authentication** | Ad-hoc console in callback/signup; V2 flag dual-path | No login/OAuth failure rates; no session-refresh failure visibility; flag state unlogged | Auth events (login_succeeded/failed, oauth_callback_error, session_refresh_failed, cookies_stripped) → logger + `product_events`; include `authV2` flag state | **P1** | V2 rollout becomes measurable; silent login breakage surfaces as a rate change |
| **SEO** | Build-gated audit (best-in-class); IndexNow | Runtime signals external (GSC) | No change now | **P3** | — |
| **Analytics** | Durable `product_events`, dedupe, GA4 backup | Telemetry-vs-product-event split at one endpoint | Document + persist both streams with a `stream` discriminator | **P1** | Funnel integrity protected while telemetry becomes queryable |
| **Database** | Health pings; RLS discipline; grants lesson (033) | Slow queries: **Unknown — not found in repository**; telemetry-table growth unbounded (no retention policy found) | Add retention/pruning cron for telemetry tables; slow-query via Supabase dashboard (external) | **P2** | Prevents the observability system becoming its own incident |

---

## 6. Production Dashboard (design only)

**Placement**: extend the existing platform-admin surface (`/api/admin/*` + `src/app/platform/`), which already has auth (`requirePlatformAdmin`), in-process caching (`admin/cache.ts`), and sections. No new service.

**Sections and data sources** (all queryable once roadmap Phases 1–4 land; ✅ = source exists today):

| Panel | Source |
|---|---|
| System health (DB/Redis/ElevenLabs/AI) | ✅ `/api/admin/system` |
| AI provider health + failovers | ✅ `provider_health_logs`, `provider_failover_events`, live intelligence |
| Daily costs (LLM + voice, by provider/user) | ✅ `ai_call_logs`, `voice_usage_logs`, `user_ai_usage_rollups` |
| Conversion funnel | ✅ `/api/admin/funnel` (`product_events`) |
| Abuse / rate-limit pressure | ✅ `abuse_detection_logs`; **new**: rate-limit outcome counters |
| Speech success rate | **new** — persisted voice beacons: sessions with `stt_start_success` and ≥1 transcript vs. sessions with failure-class events |
| Resume success rate | **new** — persisted extraction outcomes: uploads → parsed, by extraction layer |
| Payment success | **new** — persisted `[payment:*]` mirror: orders created → activated, activation replays, failures |
| Error rate / top failures | **new** — `app_error_events` grouped by `subsystem` + `errorCode` |
| Latency | `ai_call_logs.latency_ms` p50/p95 per operation (✅); route-level latency **new** (middleware duration log) |
| Credits | ✅ `credit_transactions` (service-role read) |
| Slow queries | **Unknown — not found in repository**; external Supabase tooling; defer |
| Deployment errors | `app_error_events` filtered by `release` (commit SHA) — errors-per-release after each deploy |

**Non-goals**: real-time streaming (60–120s cache is fine — matches `admin/cache.ts` precedent); public status page; alerting (a later `cron` + Resend email on threshold breach is the natural extension — Resend already integrated).

---

## 7. Production Logs MCP — specification (design only)

**Premise**: the MCP does not need a new log store. It reads the two planes that will exist after Phases 1–3: (a) Supabase telemetry tables (durable, queryable), (b) Vercel Logs API for recent console lines (**requires a Vercel API token; retention limits apply — the DB plane is primary**).

**Runtime**: standalone Node process (stdio MCP server) with **read-only** access: `SUPABASE_SERVICE_ROLE_KEY` scoped ideally to a Postgres **read-only role** created for it (new migration: `observability_reader` role with SELECT on telemetry tables only — never the full service key if avoidable), plus optional `VERCEL_TOKEN` for log tailing. It ships as a separate package/dir (e.g. `mcp/production-logs/`), not inside the Next.js bundle.

**Security invariants**
- Read-only. No tool may mutate state.
- Redaction at the tool boundary: the same denylist as the logger, applied to every returned row (defense in depth — telemetry tables should already be clean).
- No raw `email`, prompt text, resume text ever returned; user lookup accepts userId (UUID), and an email→userId resolver is a deliberate, single, audited tool.
- Result caps (default ≤200 rows) + time-window defaults (24h) on every tool.

**Tools**

| Tool | Input | Reads | Returns |
|---|---|---|---|
| `searchLogs` | query, subsystem?, level?, since?, limit? | `app_error_events` + Vercel Logs API | matching lines with full envelope |
| `traceRequest` | requestId | all tables with `request_id` + Vercel logs | ordered timeline for one request |
| `traceInterview` | interviewId | `ai_call_logs`, `voice_usage_logs`, `product_events`, `evaluations`/`answers` meta (counts+status only), `app_error_events` | full interview timeline: questions asked, LLM calls (cost/latency/success), voice sessions, client beacons, errors |
| `traceResume` | resumeId | `resumes` status fields, extraction-outcome events, `ai_call_logs` (operation=parse_resume) | upload→extract→parse timeline with layer used + quality score |
| `traceSpeech` | interviewId | persisted voice beacons + `voice_usage_logs` | STT/TTS session timeline, failure classes, device/platform context |
| `tracePayment` | orderId \| paymentId | persisted payment events, `payments` row, `credit_transactions`, `users.last_payment_id` marker | dual-path activation timeline (verify vs webhook order, replay outcomes) |
| `traceLLM` | operation?, provider?, since? | `ai_call_logs` | calls with latency/cost/error breakdown |
| `traceUser` | userId | all of the above scoped to user | recent activity summary (interviews, payments, errors) |
| `recentFailures` | subsystem?, since? | `app_error_events`, `ai_call_logs` (success=false), failure-class beacons | grouped by errorCode with counts + exemplars |
| `systemHealth` | — | same checks as `/api/admin/system` (direct DB/Redis/provider pings) | current status |
| `providerHealth` | provider?, hours? | `provider_health_logs`, `provider_failover_events` | trend series |
| `summarizeErrors` | since?, subsystem? | `app_error_events` | top errorCodes, affected-user counts, first/last seen, release correlation |

**Explicit dependency**: `traceRequest`, `traceSpeech`, `tracePayment`, `summarizeErrors` are only as good as Phases 1–3 below. **Building the MCP first would produce tools that query data that doesn't exist — hence the roadmap order.**

---

## 8. Implementation Roadmap (each phase independently deployable, additive)

| Phase | Scope | Key changes | Risk | Verify |
|---|---|---|---|---|
| **1. Telemetry durability** | Make existing critical signals queryable | Persist critical client beacons from `/api/product-events` into `product_events` (reuse `persistProductEventAsync`, keep 204-always + rate-limit contract); mirror `[payment:*]` activation events to `product_events`; add extraction-outcome event on resume parse | Low — additive writes on existing fire-and-forget paths | `npm test`, funnel dedupe unchanged, payment suite `npx vitest run src/lib/razorpay/` |
| **2. Structured logging** | One logger, mandatory envelope | `src/lib/observability/logger.ts` (console wrapper + redaction + env/release stamping); migrate `payment-log`, `ai-logger` error paths, `[interview/answer]`, auth routes internally — public APIs and grep prefixes unchanged; new `app_error_events` migration + fire-and-forget error persistence | Low-medium — touch high-risk files minimally, no control-flow changes | lint/typecheck/tests + manual grep parity check on prefixes |
| **3. Correlation IDs** | requestId everywhere | Middleware mints + forwards `x-request-id` (extend the proven 429 pattern); `getRequestId()` helper adopted per-route starting with interview/payments/resume; client sends `x-client-run-id`/`x-interview-id`; additive nullable `request_id` columns on `ai_call_logs`, `voice_usage_logs`, `product_events` | Medium — middleware is on every request; keep the change to header set/echo only | e2e suite (middleware-sensitive), both AUTH_V2 states |
| **4. Metrics** | Rates & latency queryable | Rate-limit outcome counters (Redis INCR, cheap); route-duration log line in middleware; auth events; telemetry-table retention cron | Low | unit tests on new counters |
| **5. Production dashboard** | Founder/ops panels | New `/api/admin/*` sections reading Phases 1–4 data; extend platform UI | Low — admin-gated, read-only | manual admin smoke |
| **6. Production Logs MCP** | The deliverable | `mcp/production-logs/` stdio server, read-only role, 12 tools per section 7 | Low — external read-only process | tool-by-tool against production data snapshots |

**Constraint compliance**: every phase is additive; no existing log line, prefix, event shape, or behavior is removed; degrade-don't-fail is preserved (every new write is fire-and-forget); nothing bypasses `noindex-audit`, credit-RPC lockdown, or `guard_users_privileged_update`.

---

*Verified against repository state on 2026-07-05 (working tree, branch `main`). Anything not cited to a file above was not assumed.*
