# CI/CD Architecture — InterviewEra

**Status: DESIGN — no YAML in this document.** Part of the [Engineering Platform](ENGINEERING_PLATFORM.md). Workflow-by-workflow specs live in [GITHUB_ACTIONS_ROADMAP.md](GITHUB_ACTIONS_ROADMAP.md); gate definitions in [QUALITY_GATES.md](QUALITY_GATES.md).

---

## 1. The one structural problem

Verified current topology:

```
push (any branch) ──► GitHub CI (lint→types→unit→e2e ∥ pdf ∥ audit → build)   [advisory]
      └────────────► Vercel build & deploy (previews; main → PRODUCTION)      [unconditional]
```

CI and deployment are **parallel, independent consumers of the same push**. A red CI run has never been able to stop a production deploy; the only enforced gates are inside Vercel's own build (`next build --webpack && tsx scripts/noindex-audit.ts` — compile + SEO audit). Evidence: `ci.yml` ("Real values live in Vercel — Vercel handles the actual deployment"), `vercel.json` (no gating config), `package.json` build script.

## 2. Target topology

```
feature branch push ──► CI (full) ──► Vercel PREVIEW deploy ──► (optional) preview smoke
        │
        ▼
   PR to main  ──► required checks: quality · pdf_extract · e2e_auth · build (+ migration-check when triggered)
        │                    (branch protection — requires GitHub Pro; verified 403 on current plan)
        ▼
   squash-merge ──► main push ──► Vercel PRODUCTION deploy ──► post-deploy smoke probe
        │
        ▼ (at verified checkpoints, manual)
      tag vX.Y.Z ──► release workflow (changelog + GitHub Release)   [RELEASE_STRATEGY.md]
```

Decisions embedded here:
- **Vercel keeps deploying main automatically.** We gate what *reaches* main, not how it deploys. Rationale in ENGINEERING_PLATFORM Phase 9: deploy-via-Actions was considered and rejected (makes Actions a prod dependency; hotfix path fragility).
- **Previews are the de-facto staging.** Every branch push already gets one free. The middleware request-ID change (observability RFC-009) and any middleware/SEO-adjacent work must soak on a preview URL — this is where "verify on the deployed runtime, not localhost" happens.
- **Docs-only pushes may go straight to main** (path-scoped exemption in protection config once available). Keeps the friction honest.

## 3. Pipeline stages (PR pipeline)

| Stage | Contents | Parallelism | Budget |
|---|---|---|---|
| 1. Static | lint (0 warnings), `tsc --noEmit` | with stage-2 jobs | ≤3 min |
| 2. Tests | vitest unit (includes razorpay suite); pdf_extract fixtures | parallel jobs | ≤5 min |
| 3. E2E | Playwright chromium auth suite against placeholder-env build | after static | ≤10 min |
| 4. Build | `next build` + noindex audit (placeholder env, JWT-shaped where validated) | after 1–3 | ≤8 min |
| 5. Conditional | migration-check (only when `supabase/migrations/**` changed); payments-emphasis check (only when razorpay/payments paths changed — runs the same tests as stage 2 but as a *named* required check so the protection rule can insist on it) | path-filtered | ≤3 min |
| 6. Advisory | secret scan (gitleaks), bundle-delta comment, coverage report | never blocking merge except gitleaks (blocking) | ≤4 min |

Path filtering is the main evolution over today's ci.yml: a docs-only or scripts-only change should run stage 1 and stop. Voice-file changes additionally surface a **manual-ritual reminder** (PR comment listing the CLAUDE.md voice verification steps) — automation acknowledging what it can't automate.

## 4. Environment strategy

| Env | Backing | Data | Secrets | Use |
|---|---|---|---|---|
| Local | `npm run dev` + real dev Supabase (**Unknown — not verified from repository** whether a separate dev project exists — document the answer in `.env.example` header) | dev | `.env.local` | inner loop |
| CI | placeholder env vars (JWT-shaped where format-validated) | none | none real | validation |
| Preview | Vercel per-branch | prod services (**Unknown — not verified from repository** whether previews share prod env vars — verify in dashboard; if shared, previews touch prod DB and this must be documented loudly in the RUNBOOK) | Vercel | soak, manual QA |
| Integration | `e2e-integration.yml` manual dispatch | real Supabase test project via GitHub secrets | GitHub secrets | pre-release resume flow |
| Production | Vercel main | prod | Vercel env | users |

**No staging.** Deliberate (see Phase 9 critique).

## 5. Rollback architecture

Two paths, documented in the future `docs/RUNBOOK.md`, chosen by failure type:

1. **Vercel instant rollback** (dashboard → previous deployment): minutes, no git churn. For: bad deploy, visual/runtime breakage, perf cliff. Limitation: does not revert DB migrations or cron behavior changes; note in runbook.
2. **`git revert` + push** (or PR): auditable, replays CI, produces a deployable history. For: logic bugs discovered later, anything needing a permanent record. Squash-merge policy (one commit per change) exists precisely to make this one-command.

Migrations never roll back — additive-only policy (existing house rule) means "roll forward with a corrective migration."

Release tags (RELEASE_STRATEGY.md) exist to answer the stress-time question "what's the last *verified* good state?" — today unanswerable (zero tags, verified).

## 6. Database migration verification (new, design)

Trigger: any change under `supabase/migrations/**`. Checks (a single script, design only):
- Filename sequence: strictly increasing numeric prefix, no duplicates, no edits to existing files (additive-only rule made mechanical — `git diff` against main must show only added files).
- The 033 lesson: every `CREATE TABLE` accompanied by both RLS enablement and explicit `GRANT`s in the same file (static grep-level lint; imperfect, catches the known failure class).
- Invariant guard: any `ALTER TABLE users ADD COLUMN` in the diff → job posts a blocking PR comment requiring explicit acknowledgment that `guard_users_privileged_update()` was reviewed (CLAUDE.md invariant #3); same for any statement touching `credit_transactions` or the credit RPCs (invariant #2).
- Risky-migration escalation (manual): destructive or type-changing statements → job fails with instructions to use a Supabase branch dry-run first.

## 7. Post-deploy smoke (new, design)

Trigger: Vercel production deployment success (via `deployment_status` event; exact event payload semantics to be validated during implementation — **Unknown — not verified from repository** whether the Vercel GitHub integration emits it for this repo's setup; fallback trigger: push to main + fixed delay).
Probes: `GET /` (200, contains brand string), `GET /api/health` (200, `status: ok|degraded` — treat `degraded` as warn), `GET /pricing` (200), `GET /sitemap.xml` (200). Failure → GitHub issue + email (Resend, via a tiny authenticated endpoint or Actions mail step — decide at implementation). Never auto-rollback — a solo founder should make that call with the runbook open.

## 8. Caching & runtime economics

Keep: npm cache, `.next/cache` keyed on lockfile+src (already correct in ci.yml). Add: Playwright browser cache (currently re-downloads chromium every e2e run — measurable minutes). Watch: free-plan Actions minutes (2,000/mo private); current full pipeline ≈15–20 min × push frequency. Path filtering is as much a cost measure as a speed measure. **Unknown — not verified from repository**: actual monthly minutes consumption (billing dashboard).

## 9. Notifications

Principle: **red main = loud; red branch = quiet; scheduled jobs fail-to-issue.** Main CI failure and smoke failure → email (founder reads email; no Slack to integrate — none in stack). PR failures → GitHub UI only. Nightly/weekly jobs open/update a single rolling issue rather than spamming.
