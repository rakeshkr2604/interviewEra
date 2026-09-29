# Repository Confidence Program — InterviewEra

> **Note (2026-07-05): Phase 5 (milestone roadmap) is SUPERSEDED by [MASTER_ENGINEERING_ROADMAP.md](MASTER_ENGINEERING_ROADMAP.md).** Phases 1–4 remain valid audit/analysis records. Do not schedule work from Phase 5.

Generated 2026-07-05. Objective: make this repository safe to maintain solo with AI coding tools — "change one thing without fearing another silently breaks." Analysis only; no code changed. Builds on verified evidence from [DEAD_CODE_REPORT.md](DEAD_CODE_REPORT.md), [TECH_DEBT.md](TECH_DEBT.md), [docs/REPO_RECOVERY.md](docs/REPO_RECOVERY.md), plus new scans this pass (TODO density, file-size distribution, hook-cluster mapping, lib-directory census). Anything unverifiable is marked **Unknown — not verified.**

State note: Platform P1 (docs restored, `.env.example` completed, version 1.0.0) and P2 (squash-only merges, PR template, CI PR trigger) landed before this analysis; scores reflect post-P1/P2 reality.

---

## Phase 1 — Repository Confidence Audit

Confidence = "how safely can a competent engineer (or AI tool) change this subsystem without supervision." Scored 1–10 with evidence.

### Payments — 9/10 (the gold standard in this repo)

**Why excellent, specifically**: one activation chokepoint (`activate-plan.ts`), a DB-level idempotency marker documented in three places, 11 concurrency-scenario tests (`activate-plan.test.ts`), structured trace-ID logs, restored authoritative incident doc (`PAYMENT_ARCHITECTURE.md`), NULL-safe-comparison pitfall *written down* (docs/PAYMENTS.md "Common mistakes"). This is what the rest of the repo should feel like: the dangerous knowledge is externalized into files an AI reads before editing. Deduction: `subscriptions` ghost table (001-era, zero code refs) still implies a billing model that no longer exists; `src/lib/utils/credits.ts` puts credit logic in a grab-bag folder where no one would look for payment-adjacent code.

### Resume / PDF parsing — 8/10

Layered fallback chain with explicit quality gates, typed error domain, checked-in fixtures, CI regression job (`pdf_extract`), exemplary per-route request-ID pattern, `MIN_USEFUL_CHARS` documented as a deliberate floor. Deductions: pipeline spans four dirs (`lib/pdf`, `lib/resume`, `lib/documents`, `lib/openai/parse-resume.ts`) with the AI-parse step living in a misnamed folder (see AI pipeline below); serverless-bundling coupling to `next.config.ts` is documented but remains a hidden dependency an AI could break by adding a route.

### SEO / programmatic — 7/10

The build-fails-on-contradiction gate (`noindex-audit.ts` inside `npm run build`) is the strongest correctness machinery in the repository — a wrong change *cannot deploy*. Single sitemap registry, clean naming. Deductions: content lives in enormous data files (`questions.ts` 4,502 lines, `skill-questions.ts` 1,454) and page templates up to 2,048 lines (`interview-questions/[role]/page.tsx`) — safe to *build* against but slow to navigate and easy for an AI to bloat further; triple-redundant redirects are deliberate but only documented in prose (an AI that misses the docs "fixes" the duplication).

### Interview engine (server side) — 7/10

`interview-orchestrator.ts` is 241 tidy lines; invariant #4 (never a null score) is enforced with a tested fallback path; state-table failures are explicitly non-fatal. Deductions: `[interview/answer]`'s 12 ad-hoc console calls guard the money path with no durable trail (known, planned); the `lib/interview` / `lib/interviewer` / `lib/config/interviewers` naming trio (see Phase 2 #7).

### Docs / CLAUDE.md — 8/10 (post-P1)

CLAUDE.md is genuinely excellent — invariants numbered, High-Risk table with per-system verification commands, "don't trust without re-verifying" warnings about its own stale docs. The 2026-07-05 docs/ set is accurate and cross-linked. Deductions: `Skills/` still describes a product that doesn't exist (PostHog/Zustand/Next 14); README still says Next 15 + Mistral fallback; `.env.example`'s Mistral section still claims auto-failover that `single-provider-mode.ts` contradicts; CLAUDE.md itself is gitignored-yet-historied (mixed tracking state — an AI diffing the repo can't see its changes).

### Testing — 7/10

410/410 green across 65 files; e2e in CI; payment concurrency suite; mic-coordinator stress/failure-injection tests; PDF fixtures; `verify:voice` now aliased. Deductions: email providers + `lib/supabase/server` at 0% (per restored certification doc); no coverage signal in CI; mobile voice manual-forever; the 3,589-line session page's behavior is tested only through e2e happy paths — its internal states are effectively untestable at current size.

### Analytics / telemetry — 6/10

`product_events` discipline is real (service-role writes, dedupe, GA4-is-backup documented). Deductions: the *concept* "telemetry" is spread across three folders with overlapping vocabularies — `lib/telemetry/` (9 files), `lib/observability/` (1 file), `lib/analytics/` (23 files) — plus three parallel AI-telemetry emit paths. An AI asked to "add telemetry" has four plausible homes and history shows all four were used.

### Auth — 6/10

Single Supabase door, network-verified sessions, both flag states e2e-tested, V2 modules cleanly separated. Deductions: two live code paths with **no written exit criteria for the flag** (rollout status: **Unknown — not verified** — not in the repo); an AI cannot know which path is "the future" without asking; zero auth telemetry to detect a bad flag flip.

### Database / migrations — 6/10

Additive-only discipline held across 51+ migrations; RLS on every table; the 033 RLS+GRANT lesson is written down; migration 050 closed a real gap. Deductions: 7 ghost tables (incl. `subscriptions`, `realtime_session_metrics`) make the schema lie about the system; `anon` blanket SELECT from 001 unrevisited; no machine check yet enforces the conventions (designed in P4 of the platform backlog, not built).

### AI pipeline — 6/10

The core is well-built: one chokepoint (`interview-completion.ts`), retry/timeout wrapper, cost guard, circuit breaker, DB call logs. Deductions are all *labeling*: `lib/openai/` contains OpenRouter-routed code (its own header admits it); `lib/openrouter/` and `lib/mistral/` sit beside it (one real single-file client, one fully dead); three emit paths. The machinery is a 8; the signage is a 3; an AI navigating by folder name will be wrong more often than right here.

### Components / UI — 6/10

Domain foldering is right; shadcn-derived `ui/` is conventional. Deductions: 20 dead components (7% of 285); `Navbar.tsx` is **1,467 lines** containing the repo's only two real TODOs ("wire CSV export action") — a navbar hiding unshipped feature stubs; `components/interview/` contains three session-view-like components of which one is production (`page.tsx` uses inline structure), one is dead (`VoiceInterviewSession.tsx`), one is the v2 experiment (`VoiceSessionView.tsx`).

### `lib/` organization — 6/10

The domain-grouping instinct is correct and mostly executed. Deductions, measured: **16 of ~50 lib directories contain exactly one file** (`abuse`, `api` (dead), `client`, `config`, `cost`, `dashboard`, `datetime`, `debug`, `evaluation`, `interviewer`, `mistral` (dead), `navigation`, `observability`, `openrouter`, `report`, `security`) — each is a navigation decision an AI must make with near-zero information. `lib/utils.ts` (the shadcn `cn()` file) coexists with `lib/utils/` (10 files including **domain logic**: `credits.ts`, `report.ts`, `sanitize-parsed-resume.ts`). "utils" is where meaning goes to hide.

### Interview session (client) — 3/10

The fear center of the repository. Evidence: the page is **3,589 lines** of `"use client"` code; it coordinates **24 hooks** in the interview/voice/mic/speech cluster (measured); the *recovery* concept alone is spread over three files whose names don't reveal their split (`useInterviewRecovery` = stuck-state watchdogs, `useVoiceInterviewRecovery` = refresh recovery, `lib/voice/voice-recovery.ts` = the underlying lib); `useInterviewStartup` (dead) sits beside `useInterviewStartupReliability` (live). No engineer or AI can hold this page in working memory; every change here is a leap of faith cushioned only by e2e happy paths.

### Voice — 3/10

Two complete implementations of the most-changed subsystem: legacy (production) and v2 (`core/orchestrator/conversation/tts/audio`, ~30+ files, reachable at the unlinked `/interview/session/[id]/v2` route whose header promises "once verified… the old hooks/page are deleted"). The v2 code is individually *better* (attributed logging with correlationId, dependency-free sinks, tested `AudioSessionManager`) — which makes the situation worse: the good code is the one not running. Until the cutover-or-kill decision, every voice change requires understanding both stacks, and every AI session risks editing the wrong one.

### Scripts / tooling — 5/10

11 wired scripts are solid (build gate, verify:pdf, verify:voice). 21 of 32 are unreferenced launch-era one-offs importing app code that drifts under them. `packages/node-domexception` vendored override still undocumented.

**Repository-wide positives that deserve naming**: zero circular dependencies across 1,079 files (madge — rare and valuable); only 4 TODO/FIXME comments in all of `src/` (2 real) — this is *not* a TODO-littered codebase; strict TS + Zod everywhere; migrations never rewritten; the CLAUDE.md invariant culture is the single best AI-safety asset here.

---

## Phase 2 — Confidence Killers (ranked)

| # | Killer | Rank | Evidence | Cleanup effort |
|---|---|---|---|---|
| 1 | **Voice v2 duality** — two full stacks, live-but-unlinked experimental route, cutover promised in comments and never decided | **Critical** | Phase 1 Voice; DEAD_CODE §8; TECH_DEBT H2 | Decision: hours. Execution: Large (cutover) or Medium (kill). Interim gate+README: Small |
| 2 | **3,589-line session page + 24-hook cluster** | **Critical** | measured | No rewrite. Contained by #1's resolution + extraction-on-touch discipline: ongoing |
| 3 | **AI-pipeline folder signage** — `lib/openai` misnomer, dead `lib/mistral`, single-file `lib/openrouter`, 3 emit paths | **High** | Phase 1 AI pipeline | Small (delete mistral + README breadcrumbs) — real consolidation deferred |
| 4 | **20 dead components + 2 dead hooks + dead `lib/api`** incl. deceptive neighbors (`useInterviewStartup` beside `useInterviewStartupReliability`; `VoiceInterviewSession` beside `VoiceSessionView`) | **High** | DEAD_CODE §1–2 | Small–Medium (batched deletes, build+e2e gated) |
| 5 | **7 ghost DB tables** (`subscriptions` worst — implies wrong billing model) | **High** | DEAD_CODE §3 | Small (deprecation annotations); DROPs deferred with sign-off |
| 6 | **"utils" grab bag** — domain logic (`credits.ts`, `report.ts`, resume/JD sanitizers) hidden in `lib/utils/`; separate `lib/utils.ts` | **High** | measured this pass | Medium (moves are mechanical but touch many imports; do per-file) |
| 7 | **Naming trio** `lib/interview` / `lib/interviewer` (1 file: browser voice picking!) / `lib/config/interviewers` + recovery trio (`useInterviewRecovery` / `useVoiceInterviewRecovery` / `voice-recovery.ts`) | **High** | measured this pass | Small (fold `lib/interviewer/voice.ts` into `lib/voice/`; README disambiguation for recovery trio — renames deferred) |
| 8 | **1,467-line Navbar with unshipped-feature TODOs** | Medium | measured; only real TODOs in src | Small (ticket the TODOs, note the size); extraction only on next touch |
| 9 | **16 single-file lib dirs** (2 dead, 14 live) | Medium | measured | Small–Medium (fold obvious ones opportunistically; not a dedicated churn PR) |
| 10 | **Stale narrative docs**: `Skills/` (wrong stack), README (Next 15/Mistral), `.env.example` Mistral auto-failover claim vs invariant #9 | Medium | verified | Small (one docs-truth PR) |
| 11 | **21 unreferenced scripts** | Medium | DEAD_CODE §4 | Small (founder triage → `scripts/manual/` + README, delete rest) |
| 12 | **Hidden flags without registry/exit criteria** — `NEXT_PUBLIC_AUTH_V2` (no exit criteria anywhere), `SINGLE_PROVIDER_MODE`, `IE_UPLOAD_*`, `CAMPUS_WORKSPACE_AUTO_APPROVE`, `localStorage.VOICE_DEBUG` | Medium | DEAD_CODE §6 | Small (`docs/FLAGS.md` registry with owner + exit condition each) |
| 13 | CLAUDE.md gitignored-but-historied (invisible diffs on the most important file) | Medium | verified P2 | Small (decide: track it or document why not) |
| 14 | `anon` blanket SELECT (001) unrevisited | Medium (security, not confidence per se) | ARCHITECTURE.md | Medium (enumerate + tighten, additive migration) |
| 15 | Committed `logs/`, ungitignored `.voice-verify-out/`, undocumented `packages/node-domexception` | Low | verified | Small |
| 16 | Legacy log prefixes still emitted beside `interviewTelemetry` | Low | lifecycle-log.ts comments | Fold into observability adoption passes, never standalone |

Not confidence killers (verified deliberate — an AI must be told NOT to fix): triple redirect redundancy; CSP single-source; fail-open/closed rate-limit asymmetry; all-5 fallback evaluations; `MIN_USEFUL_CHARS=12`; legacy auth path while flag rollout incomplete.

---

## Phase 3 — AI Safety Assessment

**Would Claude understand this repo?** The server side, yes — CLAUDE.md + docs/ is the best AI-context setup I've seen in a repo this size, and domain-grouped `lib/` mostly self-describes. The client interview session, no — nothing summarizes how 24 hooks compose inside a 3,589-line page; an AI reasons about it by local pattern-matching, which is exactly how subtle voice regressions happen.

**Would Cursor modify the wrong file?** High probability in four places, all verified: (1) `lib/openai/` vs `lib/openrouter/` vs `lib/ai/` for any LLM change; (2) legacy voice vs `voice/core|orchestrator/` — an AI fixing "the voice pipeline" has a coin-flip; (3) `useInterviewRecovery` vs `useVoiceInterviewRecovery`; (4) `lib/utils/credits.ts` — an AI would search `lib/razorpay`/`lib/pricing` for credit logic and, not finding this file, might *re-implement it*.

**Would an AI accidentally edit legacy/dead code?** Yes — demonstrated risk: `useInterviewStartup` (dead) is a near-name sibling of the live hook; `VoiceInterviewSession.tsx` (dead) reads like the main session component; `Skills/*.md` actively teach a false stack to any tool that ingests them.

**Biggest hallucination risks**: (1) Mistral fallback — three sources still claim it works (README, `.env.example` prose, the dead client's own code); an AI could "restore" fallback behavior invariant #9 forbids. (2) `subscriptions` table — an AI writing billing queries could target it. (3) Cron cadence and anything else where comment ≠ config (one fixed in P1; the class remains until CI checks exist).

**What should become "do not edit without explicit human instruction"** (enforced via a `docs/AI_BOUNDARIES.md` + CLAUDE.md pointer — tool-agnostic, since Cursor/Antigravity won't read tool-specific configs consistently): `supabase/migrations/**` (append-only, never edit existing), `middleware.ts` / `vercel.json` / `next.config.ts` (the trinity), `src/lib/razorpay/**`, `scripts/noindex-audit.ts`, `.github/workflows/**`. **Read-only-until-decision**: `src/lib/voice/{core,orchestrator,conversation,tts,audio}/**` + the `/v2` page (one line: "experimental v2 — do not modify or imitate without explicit instruction").

**Where documentation should be added**: (1) `src/app/(dashboard)/interview/session/[id]/README.md` — one page mapping the 24 hooks to responsibilities and naming the recovery trio's split; highest-value doc missing from the repo. (2) `src/lib/voice/README.md` — "two stacks exist; production is X; v2 status is Y". (3) One-line READMEs in `lib/openai/` ("OpenRouter-routed; name is historical") and `lib/utils/` ("no new files; domain logic moves out over time"). (4) `docs/FLAGS.md`. **Architecture diagrams**: exactly two are worth maintaining — interview-session runtime flow (page→hooks→coordinator→STT/TTS→API) and the payment dual-path sequence (exists in prose in PAYMENT_ARCHITECTURE.md; keep). More diagrams than that will rot.

---

## Phase 4 — Simplification Opportunities (behavior-preserving only)

1. **Deletion is the biggest simplifier available**: ~30 dead files (components/hooks/dirs) + `lib/mistral` + `lib/api` — repo loses ~7% of its component surface and its two worst near-name traps with zero behavior change.
2. **Resolve voice v2** — the single largest mental-load reduction possible (one stack instead of two for the most-edited subsystem). A decision, not a refactor.
3. **Fold single-file dirs opportunistically**: `lib/interviewer/voice.ts` → `lib/voice/`; `lib/evaluation/evaluation-validity.ts` → `lib/interview/` or `lib/openai/`-successor; `lib/client/` + `src/services/api.ts` → one fetch-helpers home. Rule: fold when touching, never as dedicated churn.
4. **Drain `lib/utils/` by relocation** (not rewrite): `credits.ts` → `lib/pricing/` or `lib/razorpay/`-adjacent; `report*.ts` → `lib/report/`; sanitizers → `lib/resume/` / `lib/documents/`. Each is a file move + import update, one PR each, payment-suite gate for credits.
5. **Scripts: 32 → ~13** via triage (#11 above).
6. **Doc truth pass** (README, Skills/, .env.example Mistral prose) — three small edits that remove the repo's three active hallucination feeders.
7. **Explicitly NOT recommended**: splitting the session page or Navbar as standalone projects (rewrite-shaped, voice-v2-dependent); renaming `lib/openai/` (import churn across the AI pipeline; breadcrumb README achieves 90%); consolidating the three telemetry emit paths (already planned as observability RFC-012 — don't do it twice).

---

## Phase 5 — Confidence Roadmap

Ground rules for every task: branch → PR → squash (P2 machinery); `npm run lint && npm run typecheck && npm test && npm run build` is the minimum gate; High-Risk paths add their CLAUDE.md ritual; every task independently revertible via `git revert` of one squash commit.

### Milestone 1 — Remove fear (know that nothing here is load-bearing) · ~1 day total

| Task | Reason | Affected | Benefit | Risk | Effort | Rollback | Verify |
|---|---|---|---|---|---|---|---|
| 1.1 Gate the `/v2` route (env-flag `notFound()` or admin check) + `src/lib/voice/README.md` stating two-stack status | Kills "which stack is real" ambiguity for humans and AIs without deciding the cutover | `v2/page.tsx`, new README | Voice confidence 3→5 immediately | Low (unlinked route) | Small | revert commit | build + e2e; manually confirm /v2 404s for non-admin |
| 1.2 `docs/AI_BOUNDARIES.md` (do-not-edit + read-only lists from Phase 3) + CLAUDE.md pointer + one-line `.cursorrules` pointing at CLAUDE.md | Makes the boundaries tool-agnostic instead of Claude-only | new docs, CLAUDE.md, new `.cursorrules` | Every AI tool inherits the same fences | None | Small | delete files | n/a (docs) |
| 1.3 Doc truth pass: README stack facts; archive `Skills/` → `docs/archive/`; fix `.env.example` Mistral prose; reword CLAUDE.md invariant #9 ("directory is dead", not "disabled fallback") | Removes the three active hallucination feeders | README, Skills/, .env.example, CLAUDE.md | Docs truthfulness 8→9; hallucination risk down | None | Small | revert | grep for dangling Skills/ refs |
| 1.4 Ghost-table deprecation annotations (7 tables, comment-only doc/migration note; no DROPs) + resolve CLAUDE.md tracking oddity (decide: un-ignore or document why local-only) | Schema stops lying; CLAUDE.md diffs become visible | new doc note; .gitignore or docs | DB confidence 6→7 | None | Small | revert | payment suite untouched-green |

### Milestone 2 — Remove duplication (delete the dead) · ~1–2 days

| Task | Reason | Affected | Benefit | Risk | Effort | Rollback | Verify |
|---|---|---|---|---|---|---|---|
| 2.1 Delete dead hooks (`useInterviewStartup`, `useTheme`) + `lib/mistral/` + `lib/api/` + `SttInputDebugPanel` | Removes the two worst near-name traps + misnomer fuel | 5 files/dirs | AI wrong-file risk drops where it's highest | Low | Small | revert | lint/typecheck/test/build |
| 2.2 Delete 20 dead components, two batches (landing six first, then the rest incl. `VoiceInterviewSession.tsx`, `AnswerInput.tsx`) | 7% of component surface is noise; one dead file mimics the live session view | 20 files | Navigation + search results stop lying | Low (grep-verified; build gate catches dynamic-import surprises) | Small ×2 | revert batch | build + full e2e per batch |
| 2.3 Scripts triage: keepers → `scripts/manual/` + README line each; delete the rest (founder classifies keep/delete — only you know) | 21 rotting one-offs import drifting app code | scripts/ | Tooling 5→7 | Low | Medium (your judgment is the work) | revert | `npm run build`, verify:pdf, verify:voice still wired |
| 2.4 Drain `lib/utils/`: move `credits.ts`, `report*.ts`, sanitizers to domain homes; forbid new files via README | Domain logic hidden in a grab bag is re-implementation bait | ~6 moves + imports | "Where does X live" gets one answer | Medium for credits.ts (payment-adjacent — full razorpay ritual) | Medium (one move per PR) | revert per move | payment suite for credits; test/build per move |

### Milestone 3 — Improve architecture (the one real decision) · decision + Large execution

| Task | Reason | Affected | Benefit | Risk | Effort | Rollback | Verify |
|---|---|---|---|---|---|---|---|
| 3.1 **Voice v2: cutover or kill.** Structured evaluation (run v2 route through the certification checklist; mobile smoke both stacks), then either execute cutover (v2 becomes the session view; legacy hooks/page deleted per the code's own promise) or delete v2 + strip the promise comments | Both Critical killers (#1, #2) resolve through this single decision; the 3,589-line page and 1,688-line hook die naturally on cutover, or the repo becomes single-stack on kill | ~30 v2 files + session page + voice hooks | Voice 3→7, session 3→6, largest possible one-move confidence gain | **High** — core product flow; mitigations: preview soak, full manual mobile ritual, staged (route swap is one file), Vercel instant rollback | Decision Small; execution Large (cutover) / Medium (kill) | route-swap revert = one file; deletions revert per batch | full voice ritual: unit suites + `verify:voice` + real-device mobile smoke + e2e, both before and after |
| 3.2 Fold single-file dirs (opportunistic, only when touching): `lib/interviewer` → `lib/voice`; `lib/evaluation` → interview/AI home; `services/api.ts` + `lib/client` → one home | 16 one-file decisions → fewer | per-fold | lib/ 6→7 over time | Low | Small each | revert | test/build each |
| 3.3 Session-page README (hook map + recovery-trio disambiguation) — written **after** 3.1 so it documents the surviving stack | Highest-value missing doc | new README | Onboarding + AI comprehension of the fear center | None | Small | delete | n/a |

### Milestone 4 — Increase AI safety (make the fences mechanical) · ~1–2 days

| Task | Reason | Affected | Benefit | Risk | Effort | Rollback | Verify |
|---|---|---|---|---|---|---|---|
| 4.1 `docs/FLAGS.md` registry: every flag, owner, default, exit criteria — forces writing down `NEXT_PUBLIC_AUTH_V2` exit criteria (currently **Unknown — not verified**, exists nowhere) | Flags without exit criteria live forever; AIs can't reason about dual paths without knowing which one wins | new doc | Auth 6→7; flag archaeology ends | None | Small | delete | cross-check against DEAD_CODE §6 inventory |
| 4.2 Breadcrumb READMEs: `lib/openai/` (name is historical), `lib/utils/` (no new files), `components/interview/` (which view is production) | Cheapest possible wrong-file insurance | 3 one-paragraph files | Cursor/Antigravity misdirection drops | None | Small | delete | n/a |
| 4.3 Ticket or delete Navbar's two TODOs (repo's only real ones) + note its 1,467-line size in TECH_DEBT | Unshipped-feature stubs in a navbar are AI bait ("finish the TODO") | Navbar comments, TECH_DEBT.md | TODO count → 0 or tracked | None | Small | revert | lint |
| 4.4 Weekly-health automation (knip, madge, docs link-check, env drift — already fully designed as platform P6) | Confidence decays without machinery; this converts these audits into standing properties | new workflow (designed, not YAML'd here) | Findings stop going stale | Low | Medium | disable schedule | dispatch once, verify rolling issue |

### Milestone 5 — Long-term maintainability (keep it true for 5 years) · ongoing

| Task | Reason | Effort |
|---|---|---|
| 5.1 Extraction-on-touch rule for the giants (session page, Navbar, 2,048-line SEO templates): any PR touching them must leave them smaller or same-size, never larger — a ratchet, not a project | The only rewrite-free way giants shrink | ongoing discipline |
| 5.2 New-dir rule in CLAUDE.md standards: a new `lib/` dir needs ≥2 files or a README justifying it; nothing new in `utils/` | Stops single-file-dir regrowth | one CLAUDE.md line |
| 5.3 Quarterly: re-run this audit's scans (they're all greppable one-liners; weekly-health automates most), re-score Phase 1, promote/demote TECH_DEBT | Scores are snapshots; the program is the cadence | ~1h/quarter |
| 5.4 Branch protection ON (blocked on your GitHub Pro upgrade — [docs/BRANCH_PROTECTION_SETUP.md](docs/BRANCH_PROTECTION_SETUP.md)) | Everything above is advisory until merges are actually gated | 15 min once upgraded |

**Sequencing**: M1 (1 day, zero risk) → M2 (deletes, low risk) → M3.1 decision scheduled deliberately with a clear week → M4 anytime after M1 → M5 forever. If only one milestone ever happens, do M1 — fear reduction per hour is highest there. If only one *task* ever happens, it's 3.1 — the voice decision is worth more than everything else combined.

---

### Honest bottom line

This repository is significantly better than the "rapid AI-built SaaS" stereotype — the invariant culture, zero-cycle graph, additive migrations, and payment subsystem are genuinely strong, and the worst confidence killers are **abandonment artifacts, not design flaws**: things built twice and never reconciled, built ahead and never wired, or documented and never updated. That's the good news, because deletion and decision are cheap; redesign is expensive. The repo doesn't need to be rebuilt to be trustworthy — it needs about a week of deletes and docs, one hard decision about voice, and the automation (already designed) that keeps it true afterward.
