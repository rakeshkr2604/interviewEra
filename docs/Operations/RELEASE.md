# Release

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: CI vs Vercel topology + release ritual (CI_CD + RELEASE_STRATEGY merge)
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

## Dependencies

[QUALITY_GATES](QUALITY_GATES.md) · [TESTING](../Guidelines/TESTING.md) · Vercel project

## Failure Modes

Assuming red CI blocked prod · rolling back migrations · skipping voice mobile after voice ship

## Verification

Watch CI + Vercel deploy independently; post-deploy smoke

## Change Triggers

ci.yml · vercel.json crons/redirects · release tagging process

## Related Documents

Archive CI_CD_ARCHITECTURE / RELEASE_STRATEGY / GITHUB_ACTIONS_ROADMAP for design backlog
