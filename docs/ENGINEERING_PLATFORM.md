# Engineering Platform — InterviewEra

**Status: DESIGN — nothing here is implemented. No YAML, no code.**
Master document for the engineering-platform program. Companions: [CI_CD_ARCHITECTURE.md](CI_CD_ARCHITECTURE.md) · [GITHUB_ACTIONS_ROADMAP.md](GITHUB_ACTIONS_ROADMAP.md) · [QUALITY_GATES.md](QUALITY_GATES.md) · [RELEASE_STRATEGY.md](RELEASE_STRATEGY.md) · [SOLO_FOUNDER_WORKFLOW.md](SOLO_FOUNDER_WORKFLOW.md) · [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md).
Everything is verified from the repository as of 2026-07-05; unverifiable items say **Unknown — not verified from repository.**

---

## Phase 1 — Current State Audit (honest)

| Area | Current reality | Evidence |
|---|---|---|
| CI | One workflow, `ci.yml`: push to **any** branch → quality (lint→tsc→vitest) → e2e_auth (Playwright chromium, placeholder Supabase) ∥ pdf_extract ∥ audit (critical-only) → build. Concurrency-cancel. Node 24, npm cache, Next build cache. | `.github/workflows/ci.yml` |
| CI ↔ deploy relationship | **CI gates nothing.** Vercel's Git integration deploys on push independently and in parallel; a red CI run does not stop a production deploy. The only gate that can actually stop a bad deploy is `npm run build` itself failing — which includes `scripts/noindex-audit.ts` (SEO) — inside Vercel's build. | ci.yml comment "Real values live in Vercel — Vercel handles the actual deployment"; `package.json` build script; vercel.json has no deployment gating |
| Second workflow | `e2e-integration.yml`: manual-dispatch only, real-Supabase resume integration test — a pre-release ritual, not automated. | `.github/workflows/e2e-integration.yml` |
| Deployment | Vercel-native, push-to-deploy, no Dockerfile. `vercel.json`: 5 crons, 4 `maxDuration:60` routes, www/http redirects. Production branch presumed `main`. Deployment protection / required checks in Vercel: **Unknown — not verified from repository** (dashboard config). | vercel.json |
| Branch strategy | main + occasional feature branches (`feat/mobile-interview-hardening`, `fix/pdf-parser-vercel-bundling` exist) + dependabot branches. ci.yml's own comment: "Solo workflow: validate on every push to any branch — no PR required." Direct-to-main is the norm; PRs used for dependabot (merge of PR #49 in history). | `git branch -a`, ci.yml, git log |
| Branch protection | **Unavailable**: `gh api …/branches/main/protection` → HTTP 403 "Upgrade to GitHub Pro or make this repository public". Private repo on free plan — no server-side protection possible today. | gh api call |
| Testing | Vitest unit (374 passing at launch per docs; coverage reporters configured, **no thresholds** — `vitest.config.ts` has no `thresholds` block), Playwright e2e (single chromium project, workers:1), PDF fixture regression (`verify:pdf`), voice verification scripts **outside CI** (docs/VOICE.md: manual, mandatory). Mobile: manual only. | vitest.config.ts, playwright.config.ts, docs/VOICE.md |
| Release process | **None.** Zero git tags (`git tag` is empty) despite a "release: InterviewEra v1.0.0 public launch" commit; `package.json` version is stale at `0.1.0`. No changelog, no release notes, no version discipline. Rollback = Vercel dashboard instant rollback (**Unknown — not verified from repository** whether ever exercised). | git tag, package.json, git log |
| Verification rituals | Strong but tribal: payments → `npx vitest run src/lib/razorpay/` + manual dual-order trace; voice → unit + `scripts/voice-fix-verify.mjs` (not in any npm script) + manual mobile smoke; SEO → build-gated noindex audit; resume → `verify:pdf` (in CI ✅). Documented in CLAUDE.md but enforced by memory, not machinery. | CLAUDE.md High Risk table |
| Quality gates | Real: lint 0-warnings, tsc strict, unit tests, noindex audit (build-fail), npm audit critical, PDF fixtures. Absent: coverage gate, bundle-size gate, a11y gate (`@axe-core/playwright` is installed — usage in e2e specs: present in deps; extent **Unknown — not verified from repository**), performance gate, secret scanning, migration linting. | package.json, ci.yml |
| Secrets management | Real secrets exist **only in Vercel env** (good). CI uses JWT-shaped placeholders (clever, documented in ci.yml). `.env*` gitignored. Gap: `.env.example` missing ~45 used vars incl. secrets (TECH_DEBT H3); no secret scanning anywhere; `e2e-integration.yml` consumes real Supabase secrets via GitHub secrets (names **Unknown — not verified from repository**). | ci.yml, .gitignore, DEAD_CODE_REPORT §5 |
| Dependency management | Dependabot: monthly, Monday noon IST, limit 2 PRs, grouped (@types/*, eslint*). npm `overrides` pin 5 packages incl. vendored `packages/node-domexception`. `npm audit --audit-level=critical` in CI. | .github/dependabot.yml, package.json |
| Documentation process | Excellent artifacts (CLAUDE.md + docs/ per-subsystem + recovery/observability/RFC docs — most authored 2026-07-05), **no process**: nothing detects drift. Current working tree has 8 docs deleted while still referenced (TECH_DEBT C1/C2); README states wrong stack; the health-snapshot route header says "hourly / `0 * * * *`" while vercel.json runs it **daily at 01:00** — live comment-vs-config drift in a telemetry-critical cron. | git status, README.md, health-snapshot route vs vercel.json |
| Automation | CI, Dependabot, 5 Vercel crons, build-time SEO audit. No git hooks (no husky/lint-staged/prepare script), no scheduled repo-health jobs, no auto-changelog, no stale-artifact cleanup. | package.json, repo scan |
| Developer workflow | Solo founder, heavy AI-assisted (Claude Code + Cursor + VS Code, multiple models — per session context; tool mix **Unknown — not verified from repository** beyond `.claude/` and `.vscode/` existing). `.claude/commands/` has 6 commands (review/bug/security/seo/release/architecture); CLAUDE.md is the shared AI contract. | .claude/, .vscode/, CLAUDE.md |
| Top risks (ranked) | 1) **Unguarded production path**: any push to main deploys, CI verdict irrelevant. 2) **Bus-factor-one rituals**: payment/voice verification lives in CLAUDE.md prose. 3) **No release identity**: no tags/versions → rollback target selection is guesswork under stress. 4) **No secret scanning** with multiple AI tools writing code. 5) Doc drift already demonstrably happening (cron comment, deleted docs). | above |

**Honest one-paragraph assessment**: this is a *good developer workflow* wearing the costume of a deployment pipeline. Validation quality is genuinely high (strict TS, real e2e, domain regression fixtures, build-time SEO gate — better than most seed-stage repos), but none of it stands between a bad commit and production except the Vercel build itself. Every safety property beyond "it compiles and noindex passes" is enforced by the founder's memory. The platform's job is to move those properties from memory into machinery without adding ceremony a solo founder will bypass.

---

## Phase 2 — Gap Analysis (scored vs. mature-SaaS practice, weighted for solo context)

| Category | Score | Why (evidence-based) |
|---|---|---|
| CI | **7/10** | Real pipeline with sensible topology, caching, concurrency-cancel, domain regression job (PDF). Deducts: no path filtering (voice-doc edit runs full e2e), coverage not surfaced, single browser. |
| CD | **3/10** | Push-to-deploy with zero gating between CI and production; no deploy marker (no release stamping); rollback exists (Vercel) but untested/undocumented. The 3 is for Vercel's own atomicity + instant rollback + the noindex build gate. |
| Testing | **6/10** | Strong unit+e2e+fixtures; but no coverage floor, voice ritual outside CI, mobile manual, email/`supabase/server` at 0% (TECH_DEBT H6), integration e2e requires remembering to click a button. |
| Security | **5/10** | Excellent DB posture (RLS everywhere, 050 lockdown) and secrets-only-in-Vercel; but no secret scanning, no SAST, audit only at `critical`, `anon` blanket SELECT open item (H5), admin gate partly an env email list. |
| Automation | **5/10** | CI + Dependabot + crons are real; nothing watches repo health, docs, bundle, dead code, or production post-deploy. |
| Release engineering | **2/10** | No tags, no versions, no changelog, no release checklist in machinery (the checklist doc was deleted — C2). Lowest score on the board. |
| Monitoring | **5/10** | Fully audited in docs/OBSERVABILITY.md: real DB telemetry plane + health endpoints + admin dashboard; no request IDs, console-only critical logs, no alerting. Score matches that audit; fix is already planned (Sprint 1). |
| Repository health | **6/10** | Recovery program just produced full inventory/dead-code/debt registers — but as one-off documents, not recurring automation. Health decays from the moment they were written. |
| Developer experience | **7/10** | Fast scripts, good docs, AI commands, clean domain layout, zero-cycle graph. Deducts: no hooks (feedback arrives in CI, minutes late), 21 mystery scripts, `.env.example` gaps hurt machine setup. |
| Code quality | **7/10** | Matches REPO_RECOVERY Phase 7 (strict TS, Zod, typed errors; god modules + dead code). |
| Technical debt | **6/10** | Debt is *known and registered* (TECH_DEBT.md with severities) — that's worth points; but Critical items (deleted docs) are unresolved and nothing prevents new debt. |
| Architecture drift | **4/10** | Two live voice stacks, misnamed `lib/openai/`, dead `lib/mistral/` contradicting CLAUDE.md invariant #9, cron comment vs config mismatch — drift is happening now, and no machinery detects it. |

---

## Phase 3 — Platform design (overview; detail in companion docs)

Design principles, in priority order: **(1) a red signal must be able to stop a production deploy; (2) every safety rule that lives in CLAUDE.md prose gets a machine check or stays consciously manual (never implicitly manual); (3) nothing that adds >30s to the inner loop; (4) prefer paying $4/month over building enforcement infrastructure.**

| Standard | Decision | Rationale / evidence |
|---|---|---|
| Repository standards | Keep: domain-grouped `lib/`, tests-next-to-code, numbered additive migrations, CLAUDE.md as the contract. Add: `scripts/manual/` for the 21 unwired scripts, `.env.example` completeness (already TECH_DEBT H3), `docs/RUNBOOK.md` for incident/rollback. | Existing conventions are good; codify, don't invent |
| Branch strategy | **Short-lived branches → PR → squash-merge to main → auto-deploy.** Direct push to main reserved for docs-only changes (enforced socially, then by protection once available). No develop branch, no gitflow — one long-lived branch total. | Solo founder; branches already in use occasionally |
| Branch protection | **Recommend GitHub Pro (~$4/mo) as the single highest-ROI platform purchase**: required checks (quality, build, pdf_extract, e2e_auth) + block force-push on main. Until then: protection is impossible (verified 403) — interim is discipline + the PR habit. Alternative (free): make repo public — rejected, commercial codebase. | gh api 403 evidence |
| PR workflow | Lightweight template: what/why, High-Risk-System checklist (auto-suggested by path — see CI doc), verification-ran checkboxes mirroring CLAUDE.md rules. AI review (Claude `/review` command) on every non-trivial PR **before** human self-review. | .claude/commands/review.md already exists |
| Merge strategy | Squash-merge only → linear history, one revert target per change, clean changelog input. | Matches conventional-prefix commits already in history (`fix:`, `feat:`, `release:`) |
| Release workflow | Tag-based: `vX.Y.Z` on main → release workflow generates changelog from squash commits + GitHub Release. Deploys stay continuous (every merge); **tags mark verified checkpoints**, i.e. known-good rollback targets. Full detail: [RELEASE_STRATEGY.md](RELEASE_STRATEGY.md). | Zero tags today; "v1.0.0" exists only as a commit message |
| Deployment / rollback | Keep Vercel push-to-deploy (it fits solo velocity) **but make main merge-gated** (branch protection) so "deployed" ⇒ "CI-green". Rollback: documented two-path runbook — Vercel instant rollback (minutes) or `git revert` + push (auditable). Post-deploy smoke probe automated (see nightly/smoke design). | CI_CD_ARCHITECTURE.md |
| Secrets | Keep secrets-only-in-Vercel. Add: gitleaks secret-scan job (new code + full-history once), `.env.example` completeness check in weekly health, document GitHub-secret names used by e2e-integration. | ci.yml placeholder pattern is already correct |
| Environments | prod (interviewera.com) + Vercel previews per branch + local. **No staging environment** — previews + the manual-dispatch real-Supabase integration workflow fill that role at this scale. Supabase branching for risky migrations only. | vercel.json; e2e-integration.yml |
| Feature flags | Keep the existing env-var flag pattern (`flags.ts` files — verified inventory in DEAD_CODE_REPORT §6). Add a `docs/FLAGS.md` registry with owner + expiry condition per flag (the `NEXT_PUBLIC_AUTH_V2` lesson: flags without exit criteria live forever). **No flag SaaS.** | lib/auth/flags.ts, lib/analytics/flags.ts |
| Dependency updates | Keep Dependabot monthly/grouped/limit-2 (correctly tuned for solo attention). Add: auto-merge nothing — human merges after CI green (payment/auth deps especially). | dependabot.yml |
| Repo-health automation | Weekly scheduled job re-running the recovery scans mechanically: knip (dead exports — closes DEAD_CODE gap), unused deps, `.env.example` drift, docs link-check (would have caught the 8 deleted-referenced docs), madge cycle check, bundle snapshot. Report as issue, never blocking. | REPO_RECOVERY roadmap #11 |
| Code review + AI | Design in [SOLO_FOUNDER_WORKFLOW.md](SOLO_FOUNDER_WORKFLOW.md): AI reviews first, human approves; AI has zero autonomy on payments/auth/migrations/middleware/SEO metadata. | CLAUDE.md Working Rules |
| Coverage | Report + ratchet (fail only on *decrease* vs main, floor introduced later) — never a fixed % gate first (invites test theater). | vitest coverage configured, thresholds absent |
| Security scanning | gitleaks (free) in CI; npm audit stays critical-blocking + high-warning in weekly. CodeQL: requires Advanced Security for private repos — **not free; skip** unless repo goes Pro+/public. Semgrep OSS optional later. | plan constraints verified via the 403 |
| Perf regression | Bundle-size delta report per PR (warning), Lighthouse CI on preview URLs **later** (Phase 4 of backlog; needs preview-URL wiring first). Existing `npm run analyze` stays the deep tool. | @next/bundle-analyzer in deps |
| SEO verification | Already the strongest gate (build-fail). Add nothing except keeping `audit:noindex` in the PR pipeline explicitly (it runs via build). | scripts/noindex-audit.ts |
| Dead code / drift / docs detection | Weekly health job (above). Architecture drift check = madge cycles + import-boundary lint later (e.g. "nothing outside lib/voice imports voice internals") — design only, adopt if drift recurs. | REPO_RECOVERY evidence |
| DB migration verification | New CI job on `supabase/migrations/**` changes: numbering-sequence check + static lint for the 033 lesson (every CREATE TABLE with RLS must have matching GRANTs; every new `users` column checked against `guard_users_privileged_update` blocklist) — a script, designed in CI doc. Supabase branch dry-run for risky migrations (manual). | ARCHITECTURE.md DB lesson; CLAUDE.md invariants #2/#3 |
| Payment safety verification | Path-filtered CI emphasis: changes under `src/lib/razorpay/**` or `src/app/api/payments/**` → razorpay suite runs as a **named, required** check + PR template forces the dual-order manual trace acknowledgment. | docs/PAYMENTS.md ritual |
| Voice regression verification | Honest split: unit suites in CI (already), `voice-fix-verify.mjs` gets an npm alias + optional CI job with fake-media Playwright (it already uses fake devices — CI-compatible in principle; runtime cost to be measured), mobile smoke **stays manual forever** and is encoded in the PR checklist, not fake-automated. | docs/VOICE.md |
| Resume parser verification | Already in CI (pdf_extract). Keep. | ci.yml |
| Observability verification | Once observability Sprint 1 lands: nightly probe asserts `/api/health` 200 + beacon-ingest liveness (synthetic event → row). Design detail in GITHUB_ACTIONS_ROADMAP (nightly.yml). | docs/OBSERVABILITY_EXECUTION_PLAN.md |
| Health checks / smoke / monitoring / alerting / incidents | Post-deploy smoke (3 GETs: /, /api/health, /pricing) + nightly deep probe; alerting = threshold cron → Resend email (already-integrated provider; no PagerDuty); `docs/RUNBOOK.md` with the two rollback paths + payment/voice incident steps (restoring what the deleted certification/checklist docs held). | /api/health exists; Resend in stack |

---

## Phase 9 — Self-critique

**Overengineering risks caught and cut from the design:**
- ~~Staging environment~~ — previews + manual integration workflow suffice; a staging Supabase would rot unmaintained.
- ~~CodeQL / paid SAST~~ — plan-gated, low marginal value over gitleaks + strict TS + RLS discipline at this scale.
- ~~Coverage % gates~~ — replaced with a ratchet; fixed floors generate test theater for a solo dev.
- ~~Deploy-via-Actions (vercel CLI `--prebuilt`)~~ — the "correct" enterprise fix for CI-gates-nothing, but it makes GitHub Actions a production dependency (Actions outage = can't ship a hotfix) and adds token management. Branch protection + PR habit achieves 90% of the safety at 5% of the operational surface. Revisit only if a bad deploy actually ships through a red PR.
- ~~Flag SaaS, PagerDuty, error-tracking SaaS~~ — env flags + Resend email + the observability DB plane are the right scale.
- ~~Semantic-release automation~~ — full semver automation is more machinery than a solo founder needs; manual tag + generated notes is enough (RELEASE_STRATEGY.md).
- ~~Import-boundary lint rules now~~ — designed, deferred; adopt only if the voice-v2 decision doesn't resolve the main drift source.

**Biggest hidden risks in this design:** (1) The whole gating story rests on the **GitHub Pro upgrade + PR habit** — if the founder keeps pushing to main directly, the platform is decoration; mitigation: make the PR path *faster* than the push path (AI pre-review + auto-merge-when-green). (2) **Workflow maintenance burden**: 6 workflows for one person is near the ceiling — every added job must earn its runtime; nightly/weekly jobs must fail-to-issue, never fail-to-noise. (3) **Placeholder-env drift** in CI: builds pass with fake keys, so key-shape validation bugs surface only in Vercel (already bitten: commits `d34c645`, `32855eb` are exactly this class); partially mitigated by the JWT-shaped placeholder pattern — keep extending it. (4) Free-plan constraints may also affect Actions minutes for private repos (2,000 min/mo) — current CI ≈ 15–20 min/push × solo push frequency could approach the cap; **Unknown — not verified from repository** (billing dashboard); Pro raises to 3,000 and this is another argument for the upgrade.

**What should NOT be built (permanent list):** custom deploy tooling, Kubernetes/containers (Vercel-native is a feature), monorepo tooling (single app), commit-signing enforcement, mandatory-2-review rules (there is one human), DORA-metrics dashboards, self-hosted runners.

**Missing capabilities acknowledged but deferred:** real-device mobile testing (BrowserStack-class; manual smoke remains the answer), load testing (no evidence of load-related incidents; revisit at 10× traffic), multi-region anything.
