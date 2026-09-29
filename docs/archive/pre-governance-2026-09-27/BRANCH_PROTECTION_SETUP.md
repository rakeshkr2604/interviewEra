# Branch Protection Setup — Manual Runbook

> **⛔ SUPERSEDED (2026-07-05): InterviewEra will remain on GitHub Free, permanently — this is a standing founder decision, not a temporary constraint.** See [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md)'s "Founder Decision — GitHub Free, Permanently" section. The Pro upgrade and branch-protection setup described below will not be performed. Kept for history only; do not follow these steps or re-propose this upgrade in a future task.

**Status: PARTIALLY BLOCKED, WILL REMAIN SO.** This is the operational follow-through for [Engineering Platform Phase P2](IMPLEMENTATION_BACKLOG.md#phase-p2--the-gate-highest-leverage-structural-change). Two of P2's five items are done; the other two required a paid plan upgrade, verified blocked on the current plan as of 2026-07-05, and per the founder decision above will not be pursued. The GitHub-Free safety net that replaces this runbook's intent is now `MASTER_ENGINEERING_ROADMAP.md` Task 1A.1.

## What's already done (this session)

1. **Squash-merge enforced at the repo level** — confirmed via `gh api repos/rakesh2604/InterviewEra`: `allow_squash_merge: true`, `allow_merge_commit: false`, `allow_rebase_merge: false`, `delete_branch_on_merge: true`. The merge button on every PR now only offers "Squash and merge"; merged branches auto-delete. Matches [RELEASE_STRATEGY.md](RELEASE_STRATEGY.md)'s "squash-merge only → linear history, one revert target per change."
2. **CI now triggers on pull requests targeting `main`**, in addition to the existing push-on-any-branch trigger (`.github/workflows/ci.yml`). This is what gives branch protection something to bind a required-check rule to once step 4 below is done.
3. **PR template added** (`.github/PULL_REQUEST_TEMPLATE.md`) — every new PR now shows the High-Risk-System checklist (payments/voice/resume/auth/database/SEO/analytics) and the verification checklist, mirroring CLAUDE.md's High Risk Systems table and Working Rule #7 ("never claim verification that wasn't actually run").

## What's blocked and needs your action

**Verified this session**: `gh api repos/{owner}/{repo}/branches/main/protection` → `403 Upgrade to GitHub Pro or make this repository public to enable this feature.` This is a hard plan gate, not a token-permission issue — no API call or automation can work around it. The repo is private (confirmed: `visibility: PRIVATE`), so the only paths are (a) upgrade to GitHub Pro (~$4/month for one private repo), or (b) make the repo public (rejected — commercial codebase, not appropriate here).

### Step 1 — Upgrade to GitHub Pro

GitHub.com → your avatar → **Settings** → **Billing and plans** → **Plans** → upgrade to Pro. This is a billing action; I did not and cannot do this for you.

### Step 2 — Enable branch protection on `main`

Repo → **Settings** → **Branches** → **Add branch protection rule** (or **Add rule**). Branch name pattern: `main`. Configure exactly:

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ On |
| Require approvals | Off (solo repo — one human, no second reviewer exists) |
| Require status checks to pass before merging | ✅ On |
| Status checks that are required | `Lint & Type Check`, `PDF extract regression`, `E2E Auth`, `Build` (these are the `name:` values of the `quality`, `pdf_extract`, `e2e_auth`, and `build` jobs in `.github/workflows/ci.yml` — GitHub matches by this display name, not the job id) |
| Require branches to be up to date before merging | Your call — recommended **on** if you want the merge-preview guarantee; adds a "update branch" click when main has moved. Given solo pace, leaving it **off** is a reasonable and lower-friction choice; note this in CI_CD_ARCHITECTURE.md if you change it |
| Require conversation resolution before merging | Optional — low value solo, skip |
| **Do not allow bypassing the above settings** | ✅ On (otherwise the admin/owner — you — can silently bypass, which defeats the entire point of P2) |
| Allow force pushes | ❌ Off |
| Allow deletions | ❌ Off |

**Not included as required**: the `Security Audit` (npm audit) job. This matches the original P2 scope (`quality`/`pdf_extract`/`e2e_auth`/`build` only) — audit findings are informational at PR time; a documented unfixable-transitive-high already exists (see ci.yml's own comment), and making it a hard merge-blocker risks exactly the alert-fatigue/bypass-habit failure mode described in [QUALITY_GATES.md](QUALITY_GATES.md)'s "gate philosophy." Add it later only if you decide otherwise.

### Step 3 — Verify

Per the P2 test criteria in [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md):
1. Attempt a direct push to `main` from a local clone → should be **rejected** with a message pointing at the branch protection rule.
2. Open a trivial PR (e.g., a comment-only change) from a branch → confirm the four required checks appear and bind to the PR; confirm the merge button shows **only** "Squash and merge."
3. Squash-merge that PR → confirm the source branch auto-deletes and Vercel still deploys the merged `main` commit as before (branch protection changes nothing about Vercel's own push-to-deploy behavior — that's unchanged by design, see [CI_CD_ARCHITECTURE.md](CI_CD_ARCHITECTURE.md) §1).

## Rollback

Everything above is instantly reversible from the same UI: uncheck "Do not allow bypassing," delete the branch protection rule, or re-enable merge-commit/rebase in Settings → General → Pull Requests. Reverting the CI trigger or PR template is a normal git revert of this change's commit.

## Why this matters (one-paragraph recap)

Before this phase, `git status`/CI verdicts had zero bearing on what reached production — Vercel deployed every push to `main` regardless of CI outcome (verified in the ENGINEERING_PLATFORM.md audit). Once Step 1–2 above are done, "merged to main" will finally imply "CI-green," closing the single highest-priority risk identified in that audit. Until then, the PR template and squash-merge habit are real but *advisory* — the safety net isn't load-bearing until branch protection is actually on.
