# Engineering Platform — Implementation Backlog

> **⛔ SUPERSEDED as a roadmap by [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md) (2026-07-05).** P1 and P2's code half are DONE; remaining P-phases are re-sequenced in the master roadmap. Per-task specs below remain valid reference. Do not schedule work from this file.

**Status: PLANNING — nothing implemented.** Phase 8 of the [Engineering Platform](ENGINEERING_PLATFORM.md). Every phase ≤1 week (realistically ≤2 days each at solo half-time), independently deployable and testable, with rollback. Ordered so each phase delivers standalone value even if the program stops after it.

Cross-program note: this backlog is about the *platform*; the observability program ([OBSERVABILITY_EXECUTION_PLAN.md](OBSERVABILITY_EXECUTION_PLAN.md)) and cleanup roadmap ([REPO_RECOVERY.md](REPO_RECOVERY.md) Phase 5) are separate tracks. Platform Phase 1 deliberately overlaps recovery items 1–3 — do them once, together.

---

## Phase P1 — Truth & hygiene (no workflow changes)

**Contents**: Resolve the 8 deleted-doc situation (TECH_DEBT C1/C2); complete `.env.example` (~45 vars, H3); gitignore artifacts (M6); `verify:voice` npm alias (M9); fix the health-snapshot comment-vs-config drift (route says hourly, vercel.json says daily — pick one, align both); reconcile version reality (`package.json` 0.1.0 → 1.x, retro-tag `v1.0.0` on the launch commit, tag current main).
**Test**: `git tag` non-empty; docs link-check by hand once; `npm run verify:voice` runs.
**Rollback**: pure docs/config — revert commits.
**Value (measurable)**: zero dangling doc references; release/rollback vocabulary exists for the first time.
**Effort**: ~1 day.

## Phase P2 — The gate (highest-leverage structural change)

**Contents**: Upgrade GitHub plan (Pro, ~$4/mo — the 403 blocker verified in audit); enable branch protection on main: required checks quality/pdf_extract/e2e_auth/build, block force-push; add `pull_request` trigger to ci.yml (design GITHUB_ACTIONS_ROADMAP #1 — trigger line only, no job changes yet); adopt the branch→PR→squash habit; minimal PR template with High-Risk checklists (voice mobile smoke, payment trace, auth both-flags).
**Test**: attempt a direct push to main → rejected; open a trivial PR → checks bind → squash-merge works; Vercel still deploys merged main.
**Rollback**: disable protection (instant, dashboard); habit reverts gracefully — CI still runs on push.
**Value**: **"deployed" now implies "CI-green"** — closes the audit's #1 risk. Deploy safety goes from advisory to enforced.
**Effort**: ~half day + one week of habit.

## Phase P3 — ci.yml evolution

**Contents** (evolve, don't rewrite — GITHUB_ACTIONS_ROADMAP #1): path filtering (docs-only fast path); gitleaks job (blocking; allowlist file seeded); Playwright browser cache; checkout-version tidy-up; voice-path PR-comment reminder; coverage summary comment (ratchet later).
**Test**: three probe branches — docs-only (fast path taken), payment-file touch, voice-file touch (comment appears); a planted fake secret on a branch turns gitleaks red.
**Rollback**: workflows are versioned files — revert the commit; previous ci.yml behavior returns exactly.
**Value**: PR feedback time drops for docs/small changes; secret-leak class closed; CI minutes conserved (free-plan headroom).
**Effort**: 1–2 days.

## Phase P4 — Path-triggered safety jobs

**Contents**: `migration_check` job + script (sequence, additive-only diff, RLS+GRANT pairing lint, invariant-touch acknowledgments — CI_CD_ARCHITECTURE §6); `payments_check` named job on payment paths; add both to required checks.
**Test**: probe PRs — an out-of-sequence migration file fails; a migration adding a `users` column demands acknowledgment; a razorpay-file touch produces the named check.
**Rollback**: remove jobs from required list, then revert.
**Value**: CLAUDE.md invariants #2/#3 + the 033 lesson become machinery; the two scariest change classes get bespoke gates.
**Effort**: ~2 days (the lint script is the work).

## Phase P5 — Production & preview smoke

**Contents**: `production-smoke.yml` + `preview-smoke.yml` (GITHUB_ACTIONS_ROADMAP #2/#3); validate the `deployment_status` trigger against this repo's Vercel integration (fallback: push-to-main + delay); rolling-issue + email notification wiring; first draft of `docs/RUNBOOK.md` (two rollback paths, smoke-failure response, payment/voice incident steps).
**Test**: deploy a trivial change → smoke runs green; temporarily point smoke at a bogus path → issue + email fire (then fix).
**Rollback**: delete workflows; nothing else depends on them.
**Value**: production is watched by machinery for the first time; mean-time-to-know drops from "user tells you" to ~2 minutes.
**Effort**: 1–2 days (trigger validation is the unknown).

## Phase P6 — Scheduled health

**Contents**: `nightly.yml` (e2e drift run, `verify:voice` trial, prod deep probe, audit-high report) + `weekly-health.yml` (knip, madge, docs link-check, env-drift, dead-table check, bundle snapshot) — GITHUB_ACTIONS_ROADMAP #4/#5; edge-triggered notifications; rolling issues.
**Test**: dispatch both manually; verify single-issue update behavior (run twice, one issue); plant a broken doc link → weekly catches it.
**Rollback**: delete/disable schedules.
**Value**: the Repository Recovery Program becomes a standing property instead of a snapshot; voice script leaves founder-memory.
**Effort**: ~2 days.

## Phase P7 — Release machinery

**Contents**: `release.yml` (tag → verify-green → changelog → GitHub Release — GITHUB_ACTIONS_ROADMAP #6); release checklist doc (RELEASE_STRATEGY.md §checklist) finalized; first real release cut end-to-end.
**Test**: tag a release candidate on green main → Release appears with sane changelog; tag on a red commit → refused.
**Rollback**: delete workflow + tag; nothing in production depends on releases (deploys decoupled by design).
**Value**: known-good rollback targets + changelog discipline; the stress-time "last good state?" question gets a lookup answer.
**Effort**: ~1 day.

## Phase P8 — Deferred pool (adopt only on evidence of need)

Coverage ratchet promotion to blocking (needs 4+ weeks of stable signal from P3) · auth both-flag e2e matrix on auth paths (mechanizes QUALITY_GATES #24) · Lighthouse-CI on previews (needs a perf problem + budget definition) · import-boundary lint (only if drift recurs after the voice-v2 decision) · `verify:voice` promotion from nightly-warning to path-triggered blocking (needs a flake-free nightly record) · release→`product_events` stamping (after observability Sprint 1).

---

## Sequencing & dependencies

```
P1 (truth) ──► P2 (gate) ──► P3 (ci evolution) ──► P4 (safety jobs)
                                  │
P5 (smoke) ◄──────────────────────┤   (P5 independent of P3/P4; needs only P2's habit)
P6 (scheduled) — independent, any time after P1
P7 (release) — needs P1's tags; best after P2
```

Minimum viable platform = **P1 + P2** (≈2 days): docs true, tags exist, main gated. If the program stops there forever, the single worst risk (unguarded production path) is closed and everything else remains manual-but-documented — which is exactly the current state, minus its two Critical items.

Total program: ~8–10 working days spread across 6–7 calendar weeks at solo pace, interleaved with product work and the observability sprints (platform P2 should land **before** observability Sprint 3's middleware change — that change is precisely the kind that must not reach main ungated).
