# Repository Recovery Program — InterviewEra

> **Note (2026-07-05): Phase 5 (cleanup roadmap) is SUPERSEDED by [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md).** Phases 1–4 and 7 remain valid audit records. Do not schedule work from Phase 5.

Generated 2026-07-05. Companions: [../DEAD_CODE_REPORT.md](../DEAD_CODE_REPORT.md) (Phase 2), [../TECH_DEBT.md](../TECH_DEBT.md) (Phase 6). Everything below is verified from the repository; unverifiable items say **Unknown — not verified**. Confidence = 0–10, "how sure am I this row is accurate & complete."

---

## Phase 1 — Repository Inventory

### Top level

| Directory | Purpose | Owner subsystem | Criticality | Deletable? | Conf. |
|---|---|---|---|---|---|
| `src/` | All application code | — | Critical | No | 10 |
| `supabase/migrations/` | 51+ sequential SQL migrations — authoritative schema history | Database | Critical | No | 10 |
| `public/` | Static assets, PWA icons, IndexNow key | SEO/frontend | High | No | 9 |
| `docs/` | Current-state engineering docs (ARCHITECTURE/AI_PIPELINE/VOICE/PAYMENTS/SEO/OBSERVABILITY*) | All | High | No | 10 |
| `e2e/` | Playwright specs (auth, candidate, college, interview, marketing) | Testing | High | No | 9 |
| `tests/` | Shared fixtures (PDF fixtures for verify:pdf) | Testing | High | No | 8 |
| `scripts/` | 32 ops/verification scripts — 11 wired (build/CI/npm), 21 unreferenced launch-era tools | Ops | Mixed | Partially (see DEAD_CODE §4) | 9 |
| `.github/` | CI (`ci.yml`, `e2e-integration.yml`) | Ops | Critical | No | 9 |
| `Skills/` | 3 stale aspirational AI-tool docs (PostHog/Zustand/Next 14 — not the real stack) | None | None | **Yes** (archive) | 9 |
| `logs/` | Committed launch-era output artifacts | None | None | **Yes** (+ gitignore) | 9 |
| `packages/node-domexception` | Vendored 1-file package via `overrides` | Build | Low | No (undocumented but wired) | 8 |
| `emails/` → `src/emails/` | React Email templates (`npm run email` dev server) | Email | Medium | No | 8 |
| `.claude/` | Agent commands/settings | Tooling | Low | No | 10 |
| `.voice-verify-out/`, `test-results/`, `.next/`, `.vercel/` | Build/test artifacts | None | None | Yes (`.voice-verify-out` needs a .gitignore entry) | 10 |

### `src/` second level

| Directory | Purpose | Criticality | Notes | Conf. |
|---|---|---|---|---|
| `app/` | App Router: route groups `(auth)/(dashboard)/(marketing)`, `admin`, `college`, `platform`, `auth`, `api` (~30 groups), sitemap routes | Critical | Contains the 3,589-line session page god module and the unlinked `/v2` experimental route | 9 |
| `components/` | 285 tsx in 30 domain folders | High | 20 zero-referenced (DEAD_CODE §2) | 9 |
| `hooks/` | 35 hooks, mostly interview/voice session state | Critical (interview UX) | 2 dead (`useInterviewStartup`, `useTheme`) | 9 |
| `lib/` | ~50 domain-grouped business-logic dirs | Critical | Dead: `mistral/`, `api/`. Misnamed: `openai/` (OpenRouter code) | 9 |
| `emails/` | Email templates | Medium | — | 8 |
| `services/` | One file (`api.ts`, session-page fetch client) | Medium | Fold into lib/ someday (L2) | 9 |
| `types/` | Shared TS types | High | Not audited file-by-file — **Unknown — not verified** for dead types | 5 |

### `src/lib/` clusters (50 dirs, grouped)

| Cluster | Dirs | Criticality | Conf. |
|---|---|---|---|
| Money | `razorpay`, `pricing`, `quota`, `cost` | Critical | 9 |
| AI | `ai` (routing/retry/cost/health), `openai` (misnamed — OpenRouter ops), `openrouter` (client), `mistral` (**dead**), `evaluation`, `interview`, `interviewer` | Critical | 9 |
| Voice | `voice` (legacy pipeline + v2 `core/orchestrator/conversation/tts/audio/stt`) | Critical | 9 |
| Data/auth | `supabase` (139-importer hub), `auth`, `redis`, `security`, `session`, `abuse` | Critical | 9 |
| Funnel | `analytics`, `telemetry`, `observability`, `seo`, `retention`, `referral`, `onboarding`, `landing`, `community` | High | 8 |
| Domain | `resume`, `pdf`, `documents`, `report`, `college`, `candidate`, `admin`, `dashboard`, `feedback`, `email`, `profile`, `settings`, `navigation`, `filler-words`, `http`, `client`, `api` (**dead**), `config`, `datetime`, `debug`, `server`, `utils`, `validations`, `theme` | Mixed | 7 — long tail spot-checked, not exhaustively audited |

---

## Phase 3 — Dependency Analysis

Cycle check: **madge over 1,079 files — zero circular dependencies.** (Genuinely unusual for a fast-built codebase; the domain-grouped `lib/` layout is doing its job.)

Coupling hubs (importer counts): `@/lib/supabase/server` **139** (the god hub — expected and acceptable for the DB client), `@/lib/analytics/product-events` 25, `@/lib/redis/rate-limit` 21, `@/lib/voice/lifecycle-log` 20, `@/lib/telemetry/interview-telemetry` 18. `@/lib/ai/chat-completion-core` has only 2 direct importers — all LLM traffic funnels through `interview-completion.ts`, which is the intended chokepoint.

**Authentication** — entry: `middleware.ts` (every request) → `lib/supabase/middleware::updateSession` → cookie refresh + `auth.getUser()`; `app/auth/callback` (OAuth exchange); `(auth)/` pages. Flag fork: `lib/auth/flags::isAuthV2Enabled` → `resolve-destination`/`auth-errors`/`auth-intent` (V2) vs inline legacy. Campus authz: `lib/college/api-auth::requireCampusAuth`. Critical path: middleware → updateSession → route guard. Coupling: everything auth flows through `lib/supabase/*` (deliberate single door). No cycles.

**Payments** — entry: `components/pricing/CheckoutButton` → `api/payments/create-order` (rate-limit fail-closed + config audit) → Razorpay checkout → **dual path**: `api/payments/verify` and `api/payments/webhook`, both → `lib/razorpay/activate-plan` (single source of truth) → `users.last_payment_id` marker + credit RPCs (service-role-only) + `payments`/`credit_transactions`. Logging tee: `payment-log.ts`. Critical path is deliberately diamond-shaped (either branch may run first); idempotency lives in one file. Cleanest subsystem graph in the repo.

**Interview engine** — entry: session page (3,589-line client god module) → ~20 hooks (`useInterviewSessionController`, `useInterviewMicSession`, checkpoint/draft/recovery/startup-reliability…) → `api/interview/{start,answer,process-answer,complete,[id]/*}` → `lib/interview/interview-orchestrator` (241 lines, tidy) → `agent-evaluator`/`followup-generator`/`conversation-state` → `lib/ai/interview-completion` → `chat-completion-core` → `lib/openrouter/client`. Evaluation fallback (all-5) lives in `api/interview/answer`. High coupling concentrates in the page, not the libs — the graph below the API layer is clean.

**Voice** — **two parallel stacks** sharing one gate: `mic-capture-coordinator` (singleton mutex, both stacks respect it). Legacy (production): `useMicrophone`/`useSpeechRecognition` (1,688 lines) + `stt-client::StreamingSTT` → `api/stt/token` (lease+quota+abuse gates) → Deepgram WS; TTS: `useTTS` → `api/tts` → ElevenLabs. v2 (experimental, reachable only via unlinked `/v2` route): `orchestrator/create-voice-session` → `core/*` + `conversation/http-conversation-engine` + `audio/audio-session-manager` + `tts/*` → `VoiceSessionView`. Support ring: device/permission monitors, telemetry, diagnostics classifier. This is the highest-coupling, highest-churn subsystem; the doubled stack is the coupling problem (H2 in TECH_DEBT).

**Resume parsing** — entry: `api/resume/upload` (639 lines; own request-ID pattern) → `lib/pdf/parser::extractText` → `lib/resume/extraction-pipeline` (pdfjs → pdf-parse → OCR fallback chain) → quality gates → DB → `api/resume/parse` → `graceful-parse` → `lib/openai/parse-resume` (OpenRouter-routed) → `fallback-parse` regex floor. Linear pipeline, well-layered; bundling coupling to `next.config.ts` tracing globs is the hidden edge (documented in ARCHITECTURE.md).

**Analytics** — entries: client (`funnel.ts` → GA4 bridge + `product-events` beacon → `/api/product-events` console sink) and server (`trackProductEventServer` → `product-events-store` → `product_events` table). Readers: `admin/funnel-metrics`, platform pages. Known split-brain: beacon stream is console-only (observability program fixes this). Dedupe/attribution/experiments hang off the client path. No cycles.

**SEO** — entries: `app/robots.ts`, `app/sitemap.xml` + 4 child sitemaps ← `lib/seo/sitemap/registry.ts` (single registration point); `lib/seo/programmatic/` (~29 files) feeds `(marketing)/interview-questions/*`; build gate `scripts/noindex-audit.ts` (wired into `npm run build` — the only subsystem with a compile-time correctness gate). Coupling to middleware/vercel.json/next.config redirects is deliberate triple redundancy.

**AI pipeline** — entry chokepoint `lib/ai/interview-completion` (OpenRouter-only by design) → `chat-completion-core` (retry/timeout) → `openrouter/client`; routing `openrouter-model-router` (env-overridable per-op models); guards: `llm-cost-guard`, `token-budget`, `provider-health` (circuit), `provider-intelligence` (in-process scoring); telemetry fan-out (3 paths — RFC-012). `mistral/` is a dead limb; `single-provider-mode` throws `FallbackDisabledError` without ever importing it.

**God modules**: session page (3,589), `useSpeechRecognition` (1,688), `resume/upload/route.ts` (639 — acceptable, it's exhaustive error mapping), `lib/supabase/server` by fan-in (139 — acceptable hub).

---

## Phase 4 — Confidence Audit

| Subsystem | Score | Why | Top unknowns | Top risks | Recommended cleanup |
|---|---|---|---|---|---|
| Payments | **8/10** | Single activation source of truth, 11 concurrency tests, structured logs, clean graph | Whether `subscriptions` table holds real historical rows | Authoritative incident doc (`PAYMENT_ARCHITECTURE.md`) deleted in working tree | Restore doc (C1); deprecate `subscriptions` (H4) |
| SEO | **8/10** | Build-gated audit, single sitemap registry, documented invariants | GSC/runtime state (external) | Deleted `SEO-INFRASTRUCTURE.md`/checklist still referenced ×3 | Restore/migrate docs (C2) |
| Resume/PDF | **7/10** | Layered pipeline, fixtures + `verify:pdf`, typed errors, best request-ID pattern | Real-world extraction success *rate* (no durable metrics — RFC-003) | Serverless bundling regressions (documented) | Extraction-outcome telemetry (planned) |
| AI pipeline | **7/10** | Clear chokepoint, guards, DB telemetry | Which env model overrides are set in prod (Vercel dashboard — **Unknown — not verified**) | 3 emit paths drift; misnamed `openai/` dir confuses every reader | Delete `mistral/`; README note in `openai/`; RFC-012 |
| Analytics | **7/10** | Durable `product_events`, dedupe, documented GA4-is-backup stance | Whether GA4/Clarity dashboards match `product_events` (external) | Beacon stream not persisted (planned fix) | Observability Sprint 1 |
| Interview engine | **6/10** | Libs below API layer are small and clean; fallback invariant enforced | Behavioral coverage of the 3,589-line page (e2e exists but page is opaque) | God page makes every change risky | Don't refactor standalone; ride the v2 decision |
| Auth | **6/10** | Single Supabase door, network-verified sessions, e2e both flag states | Rollout % / flip criteria for `NEXT_PUBLIC_AUTH_V2` — **Unknown — not found in repository** | Dual paths outlive memory of why; zero auth telemetry | Define V2 exit criteria in docs; RFC-008 |
| Database/RLS | **6/10** | RLS everywhere, migration 050 hardening, additive discipline | Row counts/usage of the 7 orphan tables; actual `anon` exposure surface | `anon` blanket SELECT (H5); schema-vs-code drift (H4) | Deprecation notes + anon-grant review |
| Voice | **4/10** | Strong tests + telemetry on legacy stack; coordinator invariant respected by both stacks | Which stack "wins"; v2 verification status; mobile behavior (manual-only) | Two full implementations, unlinked prod route, 1,688-line hook, highest churn | **The v2 cutover-or-kill decision (H2) — biggest single confidence purchase available** |

---

## Phase 5 — Cleanup Roadmap

Ordered by (risk reduction × confidence gain) / effort. No rewrites anywhere. Each task = one small PR with `npm run lint && npm run typecheck && npm test && npm run build` as the gate (build includes the noindex audit).

| # | Task | Effort | Risk | Confidence gain |
|---|---|---|---|---|
| 1 | Resolve the 8 deleted-doc situation (restore or migrate + fix refs) — C1/C2 | Small | None | **Huge** — docs become trustworthy again |
| 2 | `.gitignore` + untrack artifacts (`logs/`, `.voice-verify-out/`) — M6 | Small | None | Small |
| 3 | `.env.example` completion (~45 vars, grouped, secrets flagged) — H3 | Small | None | Large (setup + incident response) |
| 4 | Delete confirmed-dead files: `lib/mistral/`, `lib/api/`, 2 hooks, `SttInputDebugPanel` + update CLAUDE.md invariant #9 wording | Small | Low (build gate) | Medium |
| 5 | Delete the 20 zero-ref components in 2 batches (landing six first) | Small | Low (build + e2e gate) | Medium |
| 6 | Docs truth pass: README stack facts, archive `Skills/`, `lib/openai/` README note, `packages/` note — M5/M7/L3 | Small | None | Medium |
| 7 | Gate or 404 the `/v2` smoke route behind an env flag/admin check + `lib/voice/core/README.md` stating its status — interim for H2 | Small | Low | Large |
| 8 | Deprecation annotations for the 7 orphan tables (doc/migration comment; **no DROPs**) — H4 | Small | None | Medium |
| 9 | Founder triage of 21 unreferenced scripts (keep→`scripts/manual/`+README; else delete) — M4 | Medium | None | Medium |
| 10 | `verify:voice` npm alias for `voice-fix-verify.mjs` — M9 | Small | None | Small |
| 11 | Run `knip` (or ts-prune) to close the unused-*exports* gap this audit couldn't cover | Medium | None (report-only) | Medium |
| 12 | `anon` grant review + additive tightening migration — H5 | Medium | Medium (test with real anon key against every public page) | Large (security) |
| 13 | **Schedule the voice v2 decision** (not a cleanup — a product/eng decision meeting with the certification evidence) — H2 | Decision + Large follow-up | — | **Largest in repo** |

Items 1–8 are all doable inside one focused day and would move repository trust more than any refactor.

## Phase 7 — Repository Health Score

| Dimension | Score | Evidence |
|---|---|---|
| Architecture | **7.5/10** | Domain-grouped lib (50 dirs), route-group separation, single chokepoints (activate-plan, interview-completion, supabase clients, sitemap registry), **zero circular deps across 1,079 files**. Deductions: 3,589-line client god page; doubled voice stack; misnamed `lib/openai/` |
| Code quality | **7/10** | TS strict, Zod at boundaries, typed error domains, generation-counter/idempotency patterns show real rigor. Deductions: 1,688-line hook, 436 raw console calls, dead code accumulation (~30 files) |
| Maintainability | **6/10** | Excellent recent docs/ set + tests-next-to-code; but two voice stacks, 21 mystery scripts, dead tables, and stale README mean a newcomer must distrust-and-verify constantly |
| Observability | **6/10** | Real DB telemetry plane (023: costs/latency/health + crons + admin API) is above-average; but no request IDs, console-only critical signals, no APM, fragmented prefixes (fully audited in docs/OBSERVABILITY.md) |
| Security | **7/10** | RLS on every table, service-role lockdown (050), `guard_users_privileged_update`, fail-closed rate limits on money routes, CRON_SECRET, no local JWT trust. Deductions: `anon` blanket SELECT from 001 unrevisited (H5); admin gate partly env-var email list; secrets undocumented in .env.example |
| Performance | **7/10** | Deliberate bundling work (`outputFileTracingIncludes`, `optimizePackageImports`, AVIF/WebP), Redis rate limiting before DB work, in-process admin caches. Deductions: 3,589-line client page on the core flow; no route-latency measurement (planned) |
| Testing | **7/10** | 374 unit tests at launch, Playwright e2e in CI, PDF regression fixtures, 11 payment concurrency scenarios, stress/failure-injection tests on the mic coordinator. Deductions: 0% on email providers + `lib/supabase/server`; voice verification script outside CI; mobile manual-only |
| Documentation | **6/10** | The docs/ per-subsystem set (+ CLAUDE.md invariants) is genuinely strong and current — **but** 8 docs are deleted-while-referenced in the working tree, README misstates the stack, and Skills/ describes a product that doesn't exist. Trust requires the Phase 5 #1 and #6 fixes |
| Confidence | **6/10** | Weighted by subsystem scores above: payments/SEO high, voice low. The single biggest lever is the v2 voice decision |
| **Overall** | **6.5/10** | A genuinely better-than-it-looks codebase: the invariants, chokepoints, migration discipline, and zero-cycle graph are not what "AI-generated spaghetti" looks like. The deficit is *trust decoration*: dead limbs, doubled implementations, and doc drift that force every reader to re-verify. Phase 5 items 1–8 (≈1 day) raise Overall to ~7.5 without touching a single behavior |

---

**Standing unknowns register** (things this program could not verify from the repo): Vercel dashboard config (env values, log retention, deploy protections); Supabase production state (row counts in orphan tables, actual `anon` exposure, pg_stat activity); GA4/Clarity/GSC external dashboards; `NEXT_PUBLIC_AUTH_V2` current production value and rollout criteria; unused exports inside live files (needs knip); real-device mobile voice behavior.
