# GitHub Actions Roadmap — InterviewEra

**Status: DESIGN — no YAML.** Workflow-level specifications for the target platform. Topology and rationale: [CI_CD_ARCHITECTURE.md](CI_CD_ARCHITECTURE.md). Six workflows total — deliberately at the solo-founder maintenance ceiling; anything more must replace something.

---

## 1. `ci.yml` (evolve existing — do not rewrite)

| | |
|---|---|
| Purpose | PR/push validation: everything that must be true before code reaches main |
| Trigger | `push` (all branches), `pull_request` → main, `workflow_dispatch` (add `pull_request` so required-check status binds to PRs; keep push for direct-branch iteration) |
| Jobs & dependencies | `quality` (lint→tsc→vitest) → `e2e_auth`; `pdf_extract` ∥ `quality`; `secrets_scan` (gitleaks, new) ∥; `build` needs [quality, pdf_extract, e2e_auth]; `migration_check` (new) only when `supabase/migrations/**` in diff; `payments_check` (new, named re-run of razorpay suite) only when payment paths in diff |
| Path filtering | New: docs-only / `scripts/manual`-only changes run `quality` + `secrets_scan` and skip e2e/build. Voice-path changes → add a PR comment with the manual verification ritual (never a fake gate) |
| Runtime / parallelization | Target ≤18 min worst case, ≤4 min docs-only. quality/pdf/gitleaks parallel; e2e serialized after quality (matches today) |
| Failure behavior | Any blocking job red → PR unmergeable (once branch protection exists). Concurrency-cancel per branch (keep) |
| Artifacts | Playwright traces/screenshots on e2e failure (retention 7d); coverage summary text |
| Caching | npm (keep), `.next/cache` (keep), **add Playwright browser cache** |
| Notifications | Branch: GitHub UI only. Main: email on failure |
| Secrets required | None real (placeholder pattern stays — a core design feature, keep the JWT-shaped values documented in-file) |
| Estimated runtime | 15–18 min full; 3–4 min docs-only |
| Repository impact | Highest-traffic workflow; every improvement here compounds |

## 2. `preview-smoke.yml` (new)

| | |
|---|---|
| Purpose | Assert the Vercel **preview** deployment of a branch actually serves (catches Vercel-only failures CI's placeholder build can't: bundling/tracing, env-shape validation — the exact class of commits `d34c645`/`32855eb`/PDF-bundling incidents) |
| Trigger | `deployment_status` (state=success, environment=Preview). Fallback if the event doesn't fire for this integration (**Unknown — not verified from repository**): manual dispatch with URL input |
| Dependencies | None on other workflows |
| Checks | GET preview URL `/`, `/api/health`, `/pricing`; assert 200 + brand marker; report as PR comment (✅/❌ + URL) |
| Failure behavior | PR comment + neutral check (warning, not blocking — previews can fail for auth-protection reasons; **Unknown — not verified from repository** whether Vercel preview protection is enabled) |
| Artifacts | None; Caching | None; Secrets | Possibly a Vercel bypass token if preview protection is on |
| Estimated runtime | <1 min |
| Repository impact | Closes the "works in CI, breaks on Vercel" gap — historically the repo's most recurrent deploy failure class |

## 3. `production-smoke.yml` (new)

| | |
|---|---|
| Purpose | Post-deploy verification of production (the runbook's first responder) |
| Trigger | `deployment_status` (environment=Production, success) — fallback: push to main + delay |
| Checks | `GET https://interviewera.com/` (200 + brand string), `/api/health` (ok/degraded distinction), `/pricing`, `/sitemap.xml`; later (post-observability Sprint 1): synthetic beacon → `product_events` row assertion |
| Failure behavior | **Loud**: GitHub issue (rolling, labeled `prod-smoke`) + email. Never auto-rollback (human decision, runbook open) |
| Secrets | None for public probes; service key only if/when the beacon-row assertion is added (prefer a public health extension instead — decide at implementation) |
| Estimated runtime | <1 min |
| Repository impact | First machinery that watches production at all |

## 4. `nightly.yml` (new)

| | |
|---|---|
| Purpose | Deep checks too slow/noisy for PR time |
| Trigger | `schedule` (daily ~02:30 IST — founder timezone per dependabot config) + dispatch |
| Jobs (parallel) | (a) e2e full suite against a fresh placeholder build (drift net for flake); (b) `voice-fix-verify.mjs` via new `verify:voice` alias — fake-media Playwright, CI-compatible in principle (**runtime and stability must be measured before trusting it; if flaky, demote to weekly + dispatch**); (c) prod deep probe: sitemap URLs sample → 200s, robots.txt sanity; (d) npm audit at `high` (report-only; `critical` stays in ci.yml as blocking) |
| Failure behavior | Update a single rolling issue (`nightly-report`); email only on first failure after a green run (edge-triggered, not level-triggered — noise discipline) |
| Artifacts | Playwright traces on failure (3d retention) |
| Estimated runtime | 20–30 min, off-hours; Secrets | none real |
| Repository impact | Moves the voice verification script from "founder must remember" to "machine remembers, founder confirms" |

## 5. `weekly-health.yml` (new)

| | |
|---|---|
| Purpose | Mechanize the Repository Recovery Program so health can't silently decay again |
| Trigger | `schedule` (Monday morning IST) + dispatch |
| Jobs | (a) knip/ts-prune — unused files/exports/deps (closes DEAD_CODE_REPORT's declared gap); (b) madge circular-dep check (currently 0 — this preserves that property); (c) docs link-check over CLAUDE.md + docs/*.md (would have caught the 8 deleted-but-referenced docs at C1/C2); (d) `.env.example` drift: `process.env.*` scan vs example file (mechanizes TECH_DEBT H3 after the initial fix); (e) dead-table check: migration CREATE TABLEs vs src references; (f) bundle snapshot: build + record route sizes, diff vs last week |
| Failure behavior | Never blocks anything. Writes/updates one rolling `repo-health` issue with deltas ("2 new unused exports since last week") |
| Estimated runtime | 15–25 min; Secrets | none |
| Repository impact | Converts three one-off audit documents into a standing property of the repo |

## 6. `release.yml` (new)

| | |
|---|---|
| Purpose | Turn a pushed tag into a verified, documented release checkpoint |
| Trigger | `push` tags `v*.*.*` |
| Jobs | Verify tag commit is on main and its CI run was green → generate changelog section from squash-commit subjects since previous tag (conventional prefixes `feat:`/`fix:` already in use per git log) → create GitHub Release → (optional later) stamp release into a `product_events` row for the observability release-correlation panel |
| Failure behavior | Release not created; email. No production impact (deploys are decoupled from releases by design — see RELEASE_STRATEGY.md) |
| Secrets | `GITHUB_TOKEN` only |
| Estimated runtime | <2 min |
| Repository impact | Creates the rollback-target vocabulary that doesn't exist today (zero tags, verified) |

---

## Explicitly NOT designed (rejected; see ENGINEERING_PLATFORM Phase 9)

`deploy.yml` (Vercel deploys, not Actions) · `codeql.yml` (plan-gated, low marginal value) · `dependency-update.yml` (Dependabot already configured correctly — monthly/grouped/limit-2) · `cleanup.yml` as standalone (artifact retention set per-workflow instead; stale-branch cleanup is a weekly-health line item at most) · Lighthouse-CI workflow (deferred to backlog Phase 4+ — needs preview wiring first and a perf problem to justify it).

## Keep unchanged

`e2e-integration.yml` — manual-dispatch real-Supabase integration test is correctly scoped as a pre-release ritual; add one line to RELEASE_STRATEGY checklist so it's remembered mechanically.

## Cross-cutting requirements

All new workflows: `timeout-minutes` set explicitly; `concurrency` groups; least-privilege `permissions:` blocks (default read-only, write only where the job writes issues/releases); pinned action major versions (matches existing style, `actions/checkout@v7` — note ci.yml currently mixes v6/v7 checkouts across jobs: harmless, tidy during the evolve pass).
