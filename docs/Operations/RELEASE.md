# Release

> Status: CANONICAL
> Last Verified: 2026-10-01
> Verification Scope: CI vs Vercel topology + release ritual + agent pre-push/pre-merge gates
> Authority: How code reaches production

## Purpose

Deployment topology, rollback vocabulary, and release checkpoints.

## Current State

```
push ──► GitHub CI (advisory)     ── parallel ──► Vercel deploy (preview / main→prod)
```

**CI does not gate Vercel deploys.** Enforced gates inside Vercel build: `next build` + noindex audit.

CI (`ci.yml`): quality (lint → typecheck → unit) → parallel e2e-auth + pdf-extract → build → npm audit (critical). Integration e2e: manual workflow.

Branch protection requiring checks needs GitHub Pro — see archive `BRANCH_PROTECTION_SETUP.md` when upgrading.

### Deploys ≠ releases

- **Deploy:** every main push (Vercel)
- **Release:** tagged verified checkpoint + checklist (semver-lite). Prefer human-picked version over semantic-release automation.

### Rollback

| Mode | Use |
|---|---|
| Vercel instant rollback | Runtime/visual break (minutes) |
| `git revert` squash commit | Logic bug with history |
| Forward migration only | Never roll back SQL |

### Checklist (abbreviated)

CI green · integration e2e if resume-critical · payments dual-order if touched · voice verify + mobile if touched · Auth both flags if touched · migrations reviewed · smoke `/api` health

## Architecture / Rules

- Squash-merge only; one commit per PR
- Docs-only changes should stay low-friction
- Preview = de-facto staging

### Agent / multi-phase shipping gates

Full detail: [`ENGINEERING_WORKFLOW.md`](../Guidelines/ENGINEERING_WORKFLOW.md).

- **Deferred push** during multi-phase work unless the user explicitly authorizes an earlier push
- **Repository hygiene** after all planned phases, before push
- **Pre-push verification** (outgoing commits/files, secrets, checks) then push only with explicit authorization — normal non-force only
- **Pre-merge hygiene** on the full PR diff; merge only with explicit authorization (push ≠ merge)
- **Post-merge** tip/CI/deploy smoke as in scope; no unverified impact claims

These gates do not claim that GitHub branch protection currently blocks merges — see Current State above and [QUALITY_GATES](QUALITY_GATES.md).

## Dependencies

[QUALITY_GATES](QUALITY_GATES.md) · [TESTING](../Guidelines/TESTING.md) · [ENGINEERING_WORKFLOW](../Guidelines/ENGINEERING_WORKFLOW.md) · Vercel project

## Failure Modes

Assuming red CI blocked prod · rolling back migrations · skipping voice mobile after voice ship

## Verification

Watch CI + Vercel deploy independently; post-deploy smoke

## Change Triggers

ci.yml · vercel.json crons/redirects · release tagging process · agent push/merge policy ([ENGINEERING_WORKFLOW](../Guidelines/ENGINEERING_WORKFLOW.md))

## Related Documents

[QUALITY_GATES](QUALITY_GATES.md) · [ENGINEERING_WORKFLOW](../Guidelines/ENGINEERING_WORKFLOW.md) · Archive CI_CD_ARCHITECTURE / RELEASE_STRATEGY / GITHUB_ACTIONS_ROADMAP for design backlog
