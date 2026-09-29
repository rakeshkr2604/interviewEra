# Observability Execution Plan — Solo Founder Edition

> **⛔ SUPERSEDED as a roadmap by [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md) (2026-07-05).** The sprint sequencing below is dead; RFC implementation detail remains valid reference. Do not schedule work from this file.

**Status: PLAN — nothing scheduled here is implemented.**
Engineering-manager pass over [docs/OBSERVABILITY_RFCS.md](OBSERVABILITY_RFCS.md) for a one-engineer production SaaS where stability beats speed. Rules enforced throughout: **max 3 deploys per sprint, max one High Risk System (per CLAUDE.md's table) per deploy, every deploy independently revertible, nothing user-visible changes until the last two sprints.**

Working assumptions (stated, not verified): sprints are calendar weeks with roughly **half the week available** for this work (the other half is product/support/growth — you're a solo founder with live users); the active voice-subsystem changes in the working tree land or stabilize before Sprint 3.

---

## 1. Per-RFC EM analysis

| RFC | Independent? | Merge / split? | Hidden dependencies | Flag? | Ships dark? | Independent rollback? |
|---|---|---|---|---|---|---|
| 001 beacons→DB | Yes | Keep as-is | `product_events` write volume (Supabase row growth — pruning doesn't exist yet); migration 051 RLS is compatible (service-role writer) | Yes — env kill switch (`OBS_PERSIST_BEACONS`) | Effectively (server-side write, invisible to users) | Yes |
| 002 payment events | Yes | **Do NOT merge with 007** despite same file — 002 is incident protection *now*, 007 waits on the logger. Accept touching `payment-log.ts` twice | None | Yes — env kill switch | Effectively | Yes |
| 003 resume outcomes | Yes | Keep | Resume routes are stable, but re-verify `resume-analytics-server.ts` shape at pickup | Yes | Effectively | Yes |
| 004 logger module | Yes | **Merge with 005 into one deploy** — dead module + dark table is one logical unit and halves deploy count | None | N/A | Dark by definition | Yes (no callers) |
| 005 error table | With 004 | Merged into 004's deploy | Grants lesson (033): RLS + GRANTs both; token bucket must exist before any adopter ships | N/A | Yes (nothing writes until 006+) | Yes |
| 006 interview adoption | After 004/005 | Keep; **do not extend to orchestrator libs** in the same deploy | Assumption that no tooling parses old log shapes (verified in-repo; **unverifiable for any external habit/script you have** — check your own grep saved-searches) | Not worth it (zero-behavior diff) | No (log shapes change live) — but user-invisible | Yes |
| 007 payments adoption | After 004/005 + 002 | Keep small & solo (payments = own deploy, always) | None | No | User-invisible | Yes |
| 008 auth telemetry | After 004/005 | Keep | `updateSession` is imported by `middleware.ts` — a log line here executes on many requests; keep it to warn/error paths only to bound volume | No | User-invisible | Yes |
| 009 middleware requestId | Yes | Keep **alone in its deploy** — never bundle anything else into a middleware change | Vercel edge request-header forwarding must be proven **in preview, not localhost**; interaction with bot-bypass path (mint before or after bypass? — decide: after, bots don't need ids) | **Yes — env kill switch recommended** (`OBS_REQUEST_ID=0` skips minting) | No (header appears on responses) — cosmetic only | Yes |
| 010 request-id adoption | After 009 | **Split**: 010a = migration + writer plumbing (dark, nulls flow); 010b = interview+resume route batch; 010c = payments+stt route batch (+ absorb 007 if it hasn't shipped — same files) | Writers must tolerate null forever (009 rollback scenario) | Not needed (nullable by design) | 010a fully dark | Yes, each |
| 011 client headers | After 009 | Keep; small | **Working-tree churn**: session page + voice files have live uncommitted changes — schedule only after that lands; verify actual fetch-wrapper path | No | No (headers on requests) — user-invisible | Yes |
| 012 AI emit consolidation | Yes (needs 004) | Keep | Evaluation fallback logic (Invariant #4) lives in callers — the wrapper must not move it | No | User-invisible | Yes |
| 013 metrics | — | **Split**: 013a = rate-limit counters (`rate-limit.ts` only, safe); 013b = middleware duration line (only after 009 has soaked a week) | 013b is the *second* middleware touch — sequencing exists to never have two unproven middleware changes live | 013b: reuse 009's kill-switch pattern | User-invisible | Yes, each |
| 014 pruning cron | After volume exists | Keep; **first prod run must be `?dryRun=1`, reviewed by hand** | Delete-index verification on 023 tables; funnel-event exemption is load-bearing (founder dashboard) | Effectively (cron entry is the switch) | Dry-run mode is the dark ship | Yes (remove cron entry) |
| 015 dashboard | After 001/002/003/005 | **Split by pull, not by plan**: build only panels for questions you've actually asked in the last month; start with API sections, add UI when a section proves useful | None (read-only) | No need (admin-gated) | Admin-gated ≈ dark to users | Yes |
| 016 read-only role | Yes | Keep; **prepend a 1–2h spike**: verify Supabase custom-role/connection mechanics on a branch before writing the migration | Supabase role/PostgREST mechanics — the RFC itself flags this **Unknown** | N/A | Yes (nothing uses it) | Follow-up migration revokes |
| 017 MCP | Needs 005+016 hard | Keep; build incrementally (3 tools first: `traceInterview`, `recentFailures`, `summarizeErrors` — the ones you'll use weekly) | **Consumes zero production deploy slots** — it's an external read-only process; this changes the schedule math | N/A | Entirely out-of-band | Stop the process |

---

## 2. Sprint schedule

### Sprint 1 — Durability (nothing user-visible, signals start accumulating)

**Goal**: the three worst evaporation gaps closed; logger foundation live and dark.

| Deploy | Contents | High Risk System touched |
|---|---|---|
| 1 | RFC-001 persist client beacons | Analytics (contract preserved: 204-always) |
| 2 | RFC-002 payment activation events | Payments (tee only, zero control-flow) |
| 3 | RFC-004+005 logger module (dark) + `app_error_events` migration | None (dead code + additive migration) |

- **Risk**: Low overall. Deploy 2 carries process risk (payments file) — full razorpay suite + manual dual-ordering trace per docs/PAYMENTS.md.
- **Verification**: `npm run lint && npm run typecheck && npm test` each deploy; `npx vitest run src/lib/razorpay/` for deploy 2; after deploy 1, fire a `critical:true` event in prod and confirm the `product_events` row; funnel dashboard spot-check (dedupe untouched).
- **Rollback**: each deploy reverts independently; written rows are inert; console logging never decreased.
- **Production impact**: zero user-visible. `product_events` row volume rises (bounded by existing 240/min/IP beacon limit).

### Sprint 2 — Structured errors on the money paths

**Goal**: every error on the interview and resume paths is durable and queryable.

| Deploy | Contents | HRS |
|---|---|---|
| 1 | RFC-006 interview-route logger adoption | Interview engine |
| 2 | RFC-003 resume extraction outcomes | Resume/PDF |
| 3 | RFC-013a rate-limit outcome counters (`rate-limit.ts` only) | None |

- **Risk**: Medium on deploy 1 (mechanical diff inside answer/evaluation flow). Mitigation: review rule — any hunk touching non-logging code is rejected; run one full dev interview and confirm the all-5 fallback path still inserts.
- **Verification**: full suite + e2e interview specs (deploy 1); `npm run verify:pdf` (deploy 2); unit tests proving fail-open/closed return values byte-identical (deploy 3).
- **Rollback**: revert deploy → old console lines return. No data loss possible.
- **Production impact**: zero user-visible. `app_error_events` starts receiving real rows.

### Sprint 3 — The risky one: correlation spine

**Goal**: `x-request-id` exists platform-wide; plumbing ready to receive it.

| Deploy | Contents | HRS |
|---|---|---|
| 1 (early week) | RFC-009 middleware request ID, behind `OBS_REQUEST_ID` kill switch — **after 2–3 days of preview-deploy soak** | Treated as one (middleware = SEO invariant #7 adjacency) |
| 2 | RFC-010a migration + writer plumbing (dark, nullable) | None |
| 3 (only if 009 looks clean all week) | RFC-008 auth telemetry | Auth |

- **Risk**: **This is the highest-risk sprint.** Deploy 1 touches every request. Soak in preview first, deploy early in the week (never Friday), watch redirect behavior + GSC crawl stats for 48h. If anything smells wrong: kill switch, then revert.
- **Verification**: full e2e both AUTH_V2 states (deploys 1 and 3); manual redirect-chain checks (www→apex 301, login redirects); confirm `X-Request-Id` on responses in production; `ai_call_logs.request_id` still null (expected — routes don't pass it yet).
- **Rollback**: deploy 1 has two layers (env kill switch → instant; revert → full). Deploys 2–3 revert independently; downstream code tolerates null request ids by design.
- **Production impact**: one new response header. Nothing else user-visible.

### Sprint 4 — Correlation adoption + client join

**Goal**: telemetry rows actually carry request ids; browser context joins server requests.

| Deploy | Contents | HRS |
|---|---|---|
| 1 | RFC-010b request-id in interview + resume routes | Interview engine |
| 2 | RFC-010c payments + stt/tts routes, **absorbing RFC-007** (same files, one payments deploy) | Payments |
| 3 | RFC-011 client correlation headers + RFC-013b middleware duration line (013b only if 009 has soaked ≥1 week) | Voice-adjacent client (verify working tree settled) |

- **Risk**: Medium, breadth not depth. Deploy 3 precondition: the uncommitted voice/session changes have landed; otherwise slip 011 to Sprint 5 and ship 013b alone.
- **Verification**: razorpay suite (deploy 2); one prod interview traced end-to-end: response header id == `ai_call_logs.request_id` row (the payoff demo); e2e smoke for 013b.
- **Rollback**: each independent; headers/nulls degrade gracefully in every direction.
- **Production impact**: zero user-visible.

### Sprint 5 — Surface the data you now have

**Goal**: you can *see* speech/resume/payment success rates without writing SQL; MCP prerequisites done.

| Deploy | Contents | HRS |
|---|---|---|
| 1 | RFC-015 (phase 1): admin API sections + the 3–4 panels you actually need (speech success, resume success, payment activation, top errors by release) | None (read-only, admin-gated) |
| 2 | RFC-016 read-only DB role (after the 1–2h mechanics spike on a Supabase branch) | Database (additive role/grants only) |
| 3 | RFC-014 pruning cron **in dry-run**; enable real deletes only after hand-reviewing one dry-run output | Analytics-adjacent (funnel exemption test mandatory) |

- **Risk**: Low–Medium. The only scary item is 014's delete path — the dry-run gate and funnel-exemption unit test are non-negotiable.
- **Verification**: non-admin 403 test (deploy 1); role permission matrix on staging (deploy 2); dry-run counts reviewed (deploy 3).
- **Rollback**: all three trivially revertible; 014's cron entry removal stops deletes instantly.
- **Production impact**: zero user-visible.

### Sprint 6 — The deliverable + hygiene

**Goal**: Production Logs MCP in daily use; AI logging drift eliminated.

| Deploy | Contents | HRS |
|---|---|---|
| — (no prod deploy) | RFC-017 MCP, incremental: `traceInterview` + `recentFailures` + `summarizeErrors` first; remaining 9 tools as needed | None — external read-only process |
| 1 | RFC-012 AI emit-path consolidation | AI pipeline |
| 2 (optional) | Enable 014 real deletes; RFC-015 phase 2 panels if any proved wanted | None |

- **Risk**: Low. The MCP can't hurt production (read-only role, out-of-band). RFC-012 is the only real deploy — existing AI suites + one dev interview confirming `ai_call_logs` field parity.
- **Verification**: run each MCP tool against a known interview/payment and check the timeline reads true; redaction test with a planted secret-shaped prop.
- **Rollback**: stop the MCP process; revert deploy 1.
- **Production impact**: zero user-visible. You now debug from the editor.

Remaining long tail (not sprint-scheduled): request-id adoption in the other ~20 route groups — **opportunistic**, added whenever a route is touched for product reasons; never a dedicated deploy.

---

## 3. Self-critique

**Biggest risks**
1. **Sprint 3, deploy 1** — the middleware change is the only item that can plausibly break login redirects or SEO canonicalization for real users. Everything about the plan (kill switch, preview soak, early-week deploy, solo deploy slot) exists to contain this one diff.
2. **Solo-founder capacity is the real constraint, not engineering.** Six sprints of half-weeks is ~6 calendar weeks with zero product/growth slippage — history says an incident or a launch will interrupt. The plan survives interruption because every sprint ends in a stable, valuable state (that's why durability is Sprint 1, not correlation).
3. **Telemetry write volume**: beacons + errors + outcomes all land in Supabase before pruning exists (Sprint 5). Bounded by existing rate limits, but if a client bug fires critical events in a loop, `product_events` bloats. Mitigation available early: the RFC-001 kill switch.
4. **Working-tree collision**: the voice subsystem is under active change. RFC-011 and any voice-adjacent panel must re-verify paths at pickup — the plan defers them accordingly.

**Biggest assumptions**
- Vercel edge middleware forwards mutated request headers to Node route handlers as designed (proven only in preview soak — do not skip it).
- Supabase supports the read-only-role pattern the MCP needs (RFC-016's spike exists because this is **Unknown — not verified**).
- No external script/habit of yours parses the current console log shapes (in-repo verified; your personal grep bookmarks are not).
- `product_events` jsonb can absorb telemetry volume at current user scale without partitioning. True today; revisit at ~10× traffic.

**Should be postponed** (and is): RFC-012 (hygiene, not signal — Sprint 6); RFC-014 real deletes (no volume yet); RFC-015 phase 2 panels (build on demand); the ~20-route request-id long tail (opportunistic forever).

**Should never be built** (recommend cutting from the design):
- **Vercel log drain** — recurring cost to duplicate what the DB plane provides at this scale. Revisit only if console-line forensics (not events) become a weekly need.
- **AsyncLocalStorage request context** — explicit parameter passing matches the codebase and your team size (1). ALS is complexity for a team you don't have.
- **Alerting platform / status page** — a single threshold-check cron that emails via Resend (already integrated) is the ceiling for a long time. Anything more is ops theater for a solo founder.
- **Reviving `realtime_session_metrics`** — dead table; document as deprecated (RFC-014), drop far later with sign-off.
- **MCP email→userId resolver** — PII-adjacent surface with marginal value over a manual SQL lookup you'd do twice a month. Keep it out.
- **Warn-level log sampling/persistence** — errors are enough; warns in the DB is volume without decisions attached.

---

## 4. "If InterviewEra stopped after Sprint 2 forever…"

**~65% of the total observability value.**

Reasoning: the irreplaceable value in this whole program is **durability of signals that currently evaporate** — mobile voice failures (beacons), payment activation forensics, resume-funnel outcomes, and money-path errors. All of that exists after Sprint 2, and all of it is queryable with plain SQL in the Supabase dashboard, forever. A solo founder with SQL and durable data can answer "why did this user's interview/payment/upload fail" — slowly, but truthfully.

What the remaining sprints add: correlation ids (~15% — turns multi-query archaeology into single-key joins; valuable but the joins are *possible* without it via interviewId/userId, which already exist on the rows), and dashboard + MCP (~20% — speed and ergonomics multipliers on data that Sprint 1–2 already made permanent; they make you 5–10× faster at answers you could already get).

The honest corollary: **if only one sprint ever happens, make it Sprint 1** — that alone is ~45%, because `[client-telemetry]` and `[payment:*]` ceasing to evaporate is the single largest step-change in this entire plan.
