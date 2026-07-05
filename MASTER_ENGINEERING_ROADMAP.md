# MASTER ENGINEERING ROADMAP — InterviewEra

**This is the single source of truth for InterviewEra engineering. It supersedes every previous roadmap.**
Frozen 2026-07-05. Future work is implementation of this document. No new planning documents unless production evidence demands one.

**Superseded as roadmaps** (they remain valuable as *reference specs* for how to build individual items, but their sequencing/priorities are dead): `docs/OBSERVABILITY_EXECUTION_PLAN.md` (6 sprints), `docs/IMPLEMENTATION_BACKLOG.md` (P1–P8), `docs/REPO_RECOVERY.md` Phase 5, `REPOSITORY_CONFIDENCE_PROGRAM.md` Phase 5, **`docs/BRANCH_PROTECTION_SETUP.md` (2026-07-05 — superseded by the permanent GitHub Free decision below; kept for history, describes a path that will not be taken)**. Still-authoritative references: CLAUDE.md (invariants), subsystem docs (`docs/{ARCHITECTURE,AI_PIPELINE,VOICE,PAYMENTS,SEO}.md`), design specs (`docs/OBSERVABILITY.md`, `docs/OBSERVABILITY_RFCS.md`, `docs/{CI_CD_ARCHITECTURE,GITHUB_ACTIONS_ROADMAP,QUALITY_GATES,RELEASE_STRATEGY,SOLO_FOUNDER_WORKFLOW}.md`), and the audit records (`DEAD_CODE_REPORT.md`, `TECH_DEBT.md`).

The objective, verbatim: **a stable, trustworthy, maintainable SaaS that a solo founder can safely evolve with AI coding tools.** Not feature velocity. Not engineering beauty.

---

## Step 1 — Reconciliation of all prior recommendations

Four planning tracks were produced (observability 17 RFCs / 6 sprints; platform P1–P8; recovery 13 cleanups; confidence 5 milestones). Merging them surfaced the following:

**Duplicates (now single tasks here):**
- Weekly repo-health automation — appeared as Platform P6 *and* Confidence M4.4. One task (Phase 5).
- Branch protection — Platform P2 manual follow-up *and* Confidence M5.4. One task (Phase 1).
- AI emit-path consolidation (RFC-012) — observability Sprint 6 *and* flagged again in Confidence Phase 4. Listed once — in Future Considerations (see removals).
- Recovery roadmap items 1–3, 10 — already **done** in Platform P1 (docs restored, `.env.example`, `verify:voice`); items 4–8 re-appear refined in Confidence M1/M2. The recovery roadmap is fully absorbed.
- `docs/FLAGS.md` — platform design *and* Confidence M4.1. Once (Phase 1).

**Conflicts (resolved):**
- *Observability Sprint 3 (middleware request-ID) vs. ungated main*: the platform docs themselves flagged that P2 must precede it. Resolved by ordering: branch protection is Phase 1; middleware change is Phase 5.
- *Voice telemetry investment vs. voice v2 duality*: sprints invested in legacy-stack instrumentation while the confidence program says the stack's future is undecided. Resolved: the voice decision moves **ahead of** all voice-adjacent telemetry (RFC-011 client headers etc.). Stack-agnostic pieces (server-side beacon persistence, RFC-001) proceed — they work for either stack.
- *Nightly + weekly schedules (two workflows)* vs. the solo-maintenance ceiling those same docs preach. Resolved: **one** weekly scheduled workflow; the nightly e2e "drift run" is cut entirely (CI already runs e2e on every push — a second daily run of the same suite mostly measures flake, and a solo founder won't read two report streams).

**Outdated / unnecessary after later work:**
- Recovery #11 (run knip) — folded into the weekly health job rather than a one-off.
- Observability EM-plan sprint numbering and the platform P-numbering — replaced by the phases below.
- RFC-007 (payments logger adoption) — already absorbed into RFC-010's payments batch by the EM plan; stays absorbed.

**Removed from active roadmap entirely** (moved to Future Considerations, each with the reason it failed the "would a startup actually benefit now?" test): RFC-011 client correlation headers, RFC-012 emit consolidation, RFC-013 rate-limit/duration metrics, preview-smoke workflow, Lighthouse/perf budgets, coverage-ratchet promotion, auth both-flag e2e matrix, import-boundary lint, dashboard phase 2, warn-level log persistence, `lib/utils/` drain as a project (becomes a standing rule), ghost-table DROPs, `lib/openai` rename, session-page/Navbar splitting as projects.

---

## Execution Review — 2026-07-05 (sequencing pass, no redesign)

Before implementation began, the original Phase 1 was re-examined from a pure execution-risk lens and found to mix zero-risk documentation work with actual deletions and one ambiguous runtime-behavior change under a single "~2 days" bucket. Seven precise fixes were made; scope, phase count, and ROI ranking are unchanged — only sequencing and PR granularity:

1. **Phase 1 split into 1A (Repository Safety — zero runtime impact) and 1B (Repository Cleanup — deletions, one logical subsystem per PR, full gate each)**, per direct instruction. Every item below was re-sorted by actual runtime impact, not by topic.
2. **Route-gating for `/v2` moved out of Week 1 and into Phase 3** (was 1.2). It modifies runtime behavior (fits neither 1A nor 1B as defined) and previews the exact decision Phase 3 makes three weeks later — gating now and deciding later means touching the same route twice for negligible security gain (already auth-gated, zero inbound links, verified in the confidence audit). Now it's the first step of Phase 3 itself: gate-or-cutover-or-kill happens in one motion.
3. **The 20 dead-component deletion is now an explicit per-directory PR list** (was "two batches," which grouped 10 unrelated directories into 2 PRs — violating "no cleanup PR should delete more than one logical subsystem" the moment you look at which directories were mixed together). See Phase 1B below for the exact breakdown, including one explicit judgment call (bundling five single-file, zero-cross-dependency components from five different small directories into one "misc singleton" PR — flagged, not hidden).
4. **Gitleaks (secret scanning) pulled forward from Phase 4.1 into Phase 1A.** It is CI-only and zero runtime impact — squarely the "CI safety improvements that do NOT modify runtime behavior" category — and Phase 1B is exactly the period with the most file churn (11 deletion PRs) across multiple AI tools. Leaving secret-scanning coverage absent for the four weeks *before* Phase 4 was a real gap, not a preference. Phase 4.1 is trimmed accordingly (path filtering + Playwright cache only).
5. **`anon`-grant work split**: enumerating what `anon` can actually read (read-only investigation, zero risk) moves to Phase 1A for early visibility on a live, revenue-adjacent security question. The actual tightening migration stays in Phase 5.6 unchanged — it needs the full RLS/GRANT ritual and dedicated review time, not a Week 1 rush.
6. **Two hidden dependencies now stated explicitly** (previously implicit and therefore missable): Phase 2.4 (RFC-006) cannot start before Phase 2.3 (RFC-004+005) is deployed — noted inline. Phase 4.2's new checks were originally going to "block merges once the branch-protection rule is re-opened" — **superseded by the Founder Decision below**: GitHub Free has no such rule to re-open, so these checks are advisory permanently, same as every other check in this roadmap.
7. **Phase 6's dependency justification corrected**: two of its three chosen tools (`recentFailures`, `summarizeErrors`) only need Phase 2's `app_error_events` table and release-stamped logger — not Phase 5. This doesn't move Phase 6 earlier (still correctly last on a solo calendar — it's the payoff phase, and `traceInterview` genuinely benefits from Phase 5's correlation work), but the old text implied a dependency that doesn't exist and would mislead anyone deciding whether to start early.

No task was added, removed in substance, or re-ranked. Nothing here contradicts prior evidence — it tightens how that evidence turns into PRs.

---

## Founder Decision — GitHub Free, Permanently (2026-07-05)

**InterviewEra will remain on GitHub Free. We are not upgrading to GitHub Pro. Branch protection is not a future prerequisite — it is off the table permanently.** This is a standing engineering decision, not a temporary budget constraint; do not re-propose the Pro upgrade or branch protection in any future task unless one is explicitly asked to produce a cost/benefit analysis.

**Why this changes the execution strategy, honestly**: every safety property in this roadmap that depended on "merged to main ⇒ CI-green" rested entirely on branch protection's required-status-checks feature — verified this session (`gh api repos/.../branches/main/protection` → `403 Upgrade to GitHub Pro or make this repository public`) to be unavailable on the current plan for a private repo. **There is no GitHub Free feature that replicates this.** No CI configuration, no Actions workflow, no repo setting can force a red pull request to stay unmerged on this plan — that enforcement is a paid-tier capability, full stop. Pretending otherwise would be exactly the kind of dishonest automation `docs/QUALITY_GATES.md`'s own "gate philosophy" warns against.

The honest redesign shifts from **prevention** (a gate that mechanically blocks a bad merge) to **friction + detection** (make an accidental bad merge harder to do without noticing, and impossible to miss once it happens) — built entirely from tools that cost nothing: GitHub Actions, CI, pull requests, squash merge, documentation, review discipline, and local automation. Concretely, this means:

1. **1A.1 is redefined** (was "GitHub Pro + branch protection") into a three-part free safety net — see the updated table below. None of it is a server-side gate; all of it is either local tooling (a pre-push git hook) or CI automation that makes red status maximally visible (a merge-readiness summary, an alert on red-main). This is now the **permanent** shape of "the doors are locked" for this roadmap, not a stopgap awaited until a plan upgrade.
2. **Every other place in this roadmap that said a check "blocks merges" or "requires re-opening the branch-protection rule"** (Execution Review item 6, Phase 4.2) is reworded to say what's actually true: these checks are **advisory, permanently** — visible red/green in the PR, acted on by the one human doing the reviewing, never server-enforced.
3. **Phase 5.1** (the middleware request-ID change — already this roadmap's one High-risk diff) gets one added clause: its existing mitigations (preview-soak, early-week deploy, done alone) now carry the full weight of risk control, since there is no branch-protection backstop if something slips through.
4. **GitHub Pro / branch protection is added to the "Permanently rejected" list** in Future Considerations, so this doesn't get re-litigated by a future session that hasn't read this section.

Nothing else changes. Branch→PR→squash-merge, CLAUDE.md as the AI contract, minimal diffs, review discipline, and every phase's ROI ranking were already Pro-independent and stay exactly as they were — the roadmap's philosophy survives; only the one mechanism that can't exist on this plan is replaced with the best achievable substitute built from what's actually free.

---

## Step 2+3+4 — The roadmap (already attacked; ROI-ranked)

Assumptions: solo founder, ~half of each week on this (rest is product/support), 3–6 month horizon. Every task ships via branch → PR → squash with the standard gate (`lint`/`typecheck`/`test`/`build`) plus the CLAUDE.md ritual for High-Risk paths. Already done and out of scope: Platform P1 (doc restoration, env docs, versioning) and P2's code half (squash-only, PR template, CI PR trigger).

### Phase 1A — Repository Safety *(Day 1–2; zero runtime-behavior impact; start immediately)*

Every item here is documentation, process, CI-only, or read-only investigation — nothing here can break production because nothing here touches a code path a user or the app runtime ever executes. No build/e2e gate is required beyond the standard lint/typecheck (nothing here has test-relevant logic), but run it anyway per house habit.

| # | Task | Source | Effort |
|---|---|---|---|
| 1A.1 | **GitHub-Free workflow safety net** (permanent — no branch protection available on this plan, verified via `gh api` 403 this session; see the Founder Decision above): (a) a local pre-push git hook (Husky) that blocks direct `git push origin main` and runs lint/typecheck before any push; (b) a CI "Merge Readiness" summary job that aggregates every required check's result into one clear PR comment so nothing red hides in a separate tab; (c) a "main-red-alert" workflow that opens/updates a loud rolling GitHub issue if any required check fails on a commit that reaches `main`. Detection + friction, not a server-enforced gate — that's the honest ceiling on this plan | Redefines Platform P2 / `docs/BRANCH_PROTECTION_SETUP.md` (superseded) | Medium |
| 1A.2 | Doc truth pass: README stack facts; archive `Skills/`; fix `.env.example` Mistral auto-failover prose; reword CLAUDE.md invariant #9 (mistral dir is dead, not a "disabled fallback") | Confidence M1.3 | Small |
| 1A.3 | `docs/AI_BOUNDARIES.md` (do-not-edit: migrations-in-place, middleware/vercel.json/next.config trinity, razorpay, noindex-audit, workflows; read-only: voice v2) + `.cursorrules` one-liner pointing at CLAUDE.md + `docs/FLAGS.md` registry (forces writing AUTH_V2 exit criteria) | Confidence M1.2/M4.1 | Small |
| 1A.4 | **Gitleaks CI job** (secret scanning, blocking) — pulled forward from Phase 4.1: CI-only, zero runtime impact, and Phase 1B is exactly the highest file-churn period this roadmap has before Phase 4 would otherwise add it | Platform GITHUB_ACTIONS_ROADMAP #1 (moved up) | Small |
| 1A.5 | Repo hygiene, all doc/config-only: gitignore `logs/` + `.voice-verify-out/`; ghost-table deprecation notes (comment-only — a doc note or a harmless `COMMENT ON TABLE` migration; **not** a DROP); ticket Navbar's 2 TODOs; resolve CLAUDE.md gitignore-tracking oddity | Confidence M1.4, recovery leftovers | Small |
| 1A.6 | **`anon`-grant enumeration** (read-only investigation: what can the `anon` role actually SELECT today) — write findings to TECH_DEBT.md. The tightening migration itself stays in Phase 5.6, unchanged | TECH_DEBT H5 (split out) | Small |

**ROI**: effort ~1.5 days (1A.1's redefinition adds real implementation work vs. the original 15-minute paid checkbox) · business value High (AI tools stop being lied to; secret-scanning gap closes before peak file-churn; main-red-alert closes the detection gap left by having no branch protection) · stability +++ · risk ≈0. **Rank: #1.**

### Phase 1B — Repository Cleanup *(Day 2–4; one logical subsystem per PR, full gate each)* — **COMPLETE (2026-07-05)**

All 11 rows below executed, each gated by lint/typecheck/test/build (1B.8 also e2e-gated). 26 confirmed-dead files + 4 dead directories removed across Batches 1–10B plus the `placement-date.ts` orphan; zero regressions, zero rollbacks. 1B.11 (scripts triage) fully closed: one script deleted (`generate-pwa-icons.cjs`), one confirmed keeper left in place (`regenerate-voice-fixture.mjs`, documented in `docs/VOICE.md`), 5 archive-approved scripts moved to `scripts/manual/`, and the remaining 9 moved to a sibling `scripts-archive/` directory (not nested under `scripts/`) so their `../src/...`-relative imports keep resolving without any code edits — `tsconfig.json`/`eslint.config.mjs` exclude entries for `scripts` were mirrored for `scripts-archive` to preserve identical lint/typecheck exemption, the only infra change made. 6 scripts still need founder business-intent input before any classification and remain untouched in `scripts/`. See the Repository Confidence Refresh and Batch 11 audit for full evidence — those remain historical snapshots, not updated here.

Every PR here must pass `lint` + `typecheck` + `test` + `build` before merge (e2e too, where the deleted surface is interview/voice-adjacent). Each row is a separate PR — this is the concrete answer to "no cleanup PR should delete more than one logical subsystem," since the source plan's "two batches" of 20 unrelated components violated that rule the moment you check which directories were mixed.

| # | Task | Subsystem | Effort |
|---|---|---|---|
| 1B.1 | Delete `lib/mistral/` | AI pipeline | Small |
| 1B.2 | Delete `lib/api/` (dead `pagination.ts`) | dead infra | Small |
| 1B.3 | Delete `useInterviewStartup.ts` + `useTheme.ts` (both zero-importer hooks) | hooks | Small |
| 1B.4 | Delete `SttInputDebugPanel.tsx` | voice debug | Small |
| 1B.5 | Delete 6 dead landing components | marketing/landing | Small |
| 1B.6 | Delete 2 dead dashboard components (`ActionCards`, `ProgressStatsGrid`) | dashboard | Small |
| 1B.7 | Delete 2 dead onboarding components | onboarding | Small |
| 1B.8 | Delete 2 dead interview components (`AnswerInput`, `VoiceInterviewSession`) | interview — e2e-gated given High-Risk adjacency | Small |
| 1B.9 | Delete 2 dead shared components (`LoadingSkeleton`, `PageTransition`) | shared | Small |
| 1B.10 | Delete 5 dead singleton components across 5 unrelated small directories (`auth/RoleCard`, `layout/PlacementDateModal`, `platform/RetryFeedbackButton`, `report/SpeechPatternCard`, `seo/BlogRelatedToolsStrip`) — bundled deliberately: each is independently zero-importer with zero cross-dependency, so one PR carries no more bisection risk than five separate ones. Flagged as a judgment call, not silently applied | misc (see note) | Small |
| 1B.11 | Scripts triage: keepers → `scripts/manual/` + one README line each; delete the confirmed-dead rest | scripts | Small |

**ROI**: effort ~1 day · business value High (7% of component surface stops lying; two worst near-name traps close) · stability +++ · AI-dev gain +++ (the wrong-file traps this was designed to close) · maintenance +++. **Rank: #1 (tied with 1A — they're one phase, split for gating only).**

### Phase 2 — Make failures durable *(Weeks 2–3)*

Observability Sprint 1's core, unchanged — it survived every re-review because signals that currently *evaporate* are unrecoverable retroactively. Specs: `docs/OBSERVABILITY_RFCS.md` RFC-001/002/003/004/005/006 + the RFC-001 blueprint already written.

| # | Task | Effort |
|---|---|---|
| 2.1 | RFC-001: persist critical client beacons to `product_events` (mobile voice failures become queryable) | Medium |
| 2.2 | RFC-002: mirror payment activation events durably (incident-class protection) | Small |
| 2.3 | RFC-004+005 in one deploy: unified logger (ships dark) + `app_error_events` migration | Medium |
| 2.4 | RFC-006: interview-route logger adoption (money-path errors durable) | Medium |
| 2.5 | RFC-003: resume extraction outcome events (funnel-critical visibility) | Medium |

**Hard dependency**: 2.4 cannot start before 2.3 is deployed — RFC-006 routes existing console calls through the unified logger built in RFC-004+005. Do not parallelize these two.

**ROI**: ~4 days · business value High (the "user paid / mic failed and we can't reconstruct why" class ends) · stability +++ · AI-dev + · maintenance ++. **Rank: #2.**

### Phase 3 — The voice decision *(Week 4, scheduled deliberately — nothing else that week)*

Confidence M3.1, promoted to its own phase because **it is worth more than everything else combined** and everything voice-adjacent queues behind it.

Run the v2 route through the certification checklist + real-device mobile smoke on both stacks → decide **cutover or kill** → execute (cutover: route swap is one file, then staged deletion of legacy page/hooks; kill: delete v2 + strip the promise-comments). Full ritual before and after: unit suites, `npm run verify:voice`, mobile smoke, e2e. Rollback: route-swap revert is one file; Vercel instant rollback for runtime surprises.

**ROI**: decision hours + Large execution · business value High (the most-changed subsystem becomes single-stack; the 3,589-line page and 1,688-line hook die or get a successor *for free*) · stability +++ · AI-dev ++++ (largest single reduction of wrong-file risk) · maintenance ++++. **Rank: #3 by sequence, #1 by total value — it's later only because Phases 1–2 make it safer to execute.**

### Phase 4 — Make the pipeline safe and releases real *(Weeks 5–6)*

Platform P3/P4/P5-lite/P7, merged and trimmed. Specs: `docs/GITHUB_ACTIONS_ROADMAP.md` #1/#3/#6, `docs/RELEASE_STRATEGY.md`.

| # | Task | Effort |
|---|---|---|
| 4.1 | ci.yml evolution: path filtering (docs-only fast path), Playwright browser cache (gitleaks already shipped in Phase 1A) | 1 day |
| 4.2 | Path-triggered safety jobs: `migration_check` (sequence/additive/RLS+GRANT lint/invariant acknowledgments) + `payments_check` named check. **Advisory, permanently** (per the Founder Decision — GitHub Free has no required-status-check mechanism to add these to): their pass/fail surfaces in the PR and in 1A.1's merge-readiness summary + main-red-alert automation; review discipline is what makes them count | ~2 days |
| 4.3 | `production-smoke.yml` (post-deploy probes: /, /api/health, /pricing, /sitemap.xml → rolling issue + email) + first `docs/RUNBOOK.md` (two rollback paths, incident steps) | 1 day |
| 4.4 | `release.yml` (tag → verify-green → changelog → GitHub Release) + cut the first real release end-to-end | 1 day |

**ROI**: ~5 days · business value Medium-High (invariants #2/#3 become machinery; production watched; known-good rollback targets exist) · stability +++ · AI-dev ++ (gates don't care who wrote the code) · maintenance ++. **Rank: #4.**

### Phase 5 — Correlate and observe *(Weeks 7–9)*

The trimmed remainder of the observability program — only what the MCP needs plus standing health automation.

| # | Task | Effort |
|---|---|---|
| 5.1 | RFC-009: middleware `x-request-id` behind kill switch, **preview-soak first**, early-week deploy, alone (the one High-risk diff in this roadmap — and given the Founder Decision, there is no branch-protection backstop if this slips through red; the kill switch and solo-deploy discipline are carrying the full weight of risk control here, not a secondary safety net) | Medium |
| 5.2 | RFC-010a+b: `request_id` columns + writer plumbing + interview/payments/resume/stt route adoption | Large |
| 5.3 | RFC-008: auth telemetry events incl. `authV2` flag state (both-flag e2e per house rule) | Medium |
| 5.4 | **One** `weekly-health.yml`: knip, madge, docs link-check, env-drift, dead-table check, bundle snapshot, `verify:voice`, prod deep probe, npm-audit-high — single rolling issue, edge-triggered email | ~2 days |
| 5.5 | Minimal dashboard: 2–3 admin panels only (payment activation success, speech success, top errors by release) on the existing admin surface | Medium |
| 5.6 | RFC-014 retention pruning, dry-run gated, funnel-events exempt (data volume justifies it by now) + `anon`-grant **tightening migration** (enumeration already done in Phase 1A.6 — this is the additive migration acting on those findings, per the full RLS/GRANT review ritual) | Medium×2 |

**ROI**: ~7 days · business value Medium (debugging speed; V2-flag safety; security posture) · stability ++ · AI-dev ++ · maintenance +++ (the audits become standing machinery — health stops decaying silently). **Rank: #5.**

### Phase 6 — The Production Logs MCP *(Weeks 10–12)*

The original end-goal, kept — but at minimum viable scope: RFC-016 read-only DB role (after the Supabase-mechanics spike) + `mcp/production-logs/` with **three tools**: `traceInterview`, `recentFailures`, `summarizeErrors`. The other nine designed tools get built only when a real debugging session wants them. Zero production coupling; consumes no deploy slots.

**ROI**: ~4 days · business value Medium-High *for you specifically* (debug from the editor; the payoff of Phases 2+5) · stability neutral · AI-dev ++++ (AI tools gain eyes on production) · maintenance ++. **Rank: #6 by sequence.** Precise dependency (corrected from the original draft): `recentFailures` and `summarizeErrors` only need Phase 2's `app_error_events` table and release-stamped logger — not Phase 5. `traceInterview` benefits from Phase 5's correlation work but doesn't strictly require it. It stays scheduled last regardless — it's the payoff phase on a solo calendar, not a phase blocked on Phase 5 — but don't read the old "data doesn't exist yet" line as a hard Phase-5 dependency; it wasn't quite accurate.

---

## Standing rules (not phases — permanent, zero-scheduling)

1. **Extraction-on-touch ratchet**: any PR touching the giants (session page, Navbar, 2,000-line SEO templates) leaves them same-size or smaller. Never larger.
2. **No new single-file `lib/` dirs; nothing new in `lib/utils/`** — domain logic moves out of utils opportunistically when touched (credits.ts with full payments ritual).
3. **Fold-on-touch**: single-file dirs (`lib/interviewer`, `lib/evaluation`, `lib/client`+`services`) fold into real homes when next edited — never as dedicated churn PRs.
4. **Flags need exit criteria** in `docs/FLAGS.md` before merging; a flag without one is a review rejection.
5. **AI workflow** per `docs/SOLO_FOUNDER_WORKFLOW.md`: AI never autonomously touches payments, applied migrations, the redirect/CSP trinity, or deletes what it didn't create; `/review` + `/security` before human read on risky diffs; "verification not run" = "verification failed."
6. **Quarterly** (~1 hour): re-run the confidence scans (weekly-health automates most), re-score, promote/demote TECH_DEBT. No new roadmap documents — findings become tasks inside these phases or Future Considerations.

## Future Considerations (build only on production evidence)

Each entry names its trigger — without the trigger, it stays here:
- **RFC-011 client correlation headers** — when a real debugging session fails specifically for lack of client↔server joins (interviewId already bridges most).
- **RFC-012 AI emit consolidation** — when the three emit paths cause an actual mis-diagnosis, or next time `chat-completion-core.ts` is opened for product reasons.
- **RFC-013 rate-limit/duration metrics; preview-smoke workflow** — when a 429 storm or preview-only breakage actually bites.
- **Coverage ratchet → blocking; auth both-flag CI matrix** — after 4+ weeks of stable coverage signal / when auth-path change frequency justifies the CI minutes.
- **Lighthouse budgets; bundle gates** — when a perf regression is observed or Core Web Vitals degrade in GSC.
- **Import-boundary lint** — only if architecture drift recurs *after* the voice decision.
- **Dashboard phase 2; MCP tools 4–12; warn-level persistence; release→product_events stamping** — on demand from real usage.
- **Ghost-table DROPs** — after row-count checks + a quarter of deprecation annotations causing zero confusion.
- **Splitting the session page / Navbar as projects; renaming `lib/openai/`** — likely never; the ratchet and breadcrumb READMEs are the intended resolution.
- **Permanently rejected** (re-litigating requires new evidence, not new taste): **GitHub Pro / branch protection (standing founder decision, 2026-07-05 — see "Founder Decision" above; do not recommend paid GitHub features again unless a future task explicitly asks for a cost/benefit analysis)**, staging environment, CodeQL/paid SAST, deploy-via-Actions, semantic-release, flag SaaS, alerting platforms, error-tracking SaaS, load testing at current traffic, monorepo tooling, DORA dashboards.

## Step 3 record — what the adversarial pass killed

So the reasoning isn't lost: nightly e2e drift run (duplicates per-push CI; measures flake, not regressions), second scheduled workflow (one report stream for one reader), preview-smoke (marginal over prod-smoke + CI; trigger reliability unverified), full 12-tool MCP (9 tools without a proven consumer), dashboard beyond 3 panels (panels nobody asks questions of are decoration), correlation Phase beyond 010b (remaining ~20 route groups are opportunistic follow-ups), RFC-012 now (hygiene without a triggering incident), utils-drain as a project (churn without a touch-reason), and every "good engineering" item that couldn't name the production question it answers.

## The freeze

Planning is complete. The documents listed at the top are reference material; this file is the only active roadmap. If production evidence contradicts a phase, amend **this file** — don't write a new plan. Total active scope: **~22 working days across ~12 calendar weeks at half-time**, front-loaded so that stopping after any phase leaves the repository strictly better than before it.

If only one week ever happens: **Phase 1A, then 1B if there's time.** If only one decision ever happens: **the voice decision.** If the whole roadmap happens: InterviewEra becomes what the goal statement asks for — a SaaS one person can evolve with AI tools without fear.
