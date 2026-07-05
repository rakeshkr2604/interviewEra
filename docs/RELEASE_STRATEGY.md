# Release Strategy — InterviewEra

**Status: DESIGN.** Part of the [Engineering Platform](ENGINEERING_PLATFORM.md).

## Current state (verified)

- **Zero git tags.** The "v1.0.0 public launch" exists only as commit message `271a42f`.
- `package.json` version: `0.1.0` — contradicts the launched-v1 reality.
- No changelog, no release notes, no release checklist in machinery (the `PRE_DEPLOY_SEO_CHECKLIST.md` that partially served this is deleted in the working tree — TECH_DEBT C2).
- Deployment cadence: every push to main is a production deploy (Vercel).

## Core design decision: deploys ≠ releases

Continuous deployment stays (it fits solo velocity and Vercel makes it safe-ish). A **release** is redefined as a *verified checkpoint*: a tag on main asserting "at this commit, the full ritual was run — this is a known-good rollback target and a changelog boundary." Deploys happen many times a week; releases happen when meaningful chunks land (a sprint, an RFC wave, a feature).

This resolves the tension between "solo founder ships constantly" and "under incident stress there is no answer to *what was the last good state?*" — today that question is genuinely unanswerable from the repo.

## Versioning

- **Semver-lite**: `vMAJOR.MINOR.PATCH`. MINOR = feature checkpoint; PATCH = fix-only checkpoint; MAJOR = reserved for genuinely breaking product epochs (rare; v2 voice cutover would qualify).
- First action: reconcile reality — tag current verified main as `v1.1.0` (v1.0.0 being the launch commit, historically taggable retroactively) and set `package.json` to match. Keep the two in lockstep thereafter (release workflow verifies the match — a one-line check).
- **No semantic-release automation.** Commit-message-driven auto-versioning is machinery a solo founder debugs at the worst times. Human picks the number; the workflow does the paperwork.

## Release procedure (the ritual, ~15 minutes)

1. Confirm main CI green.
2. Run the release checklist (below) — mechanized pieces are just "look at the dashboards," manual pieces are the honest rituals.
3. `npm version <minor|patch>` (bumps package.json, creates tag) → push tag.
4. `release.yml` (GITHUB_ACTIONS_ROADMAP #6) verifies tag-on-green-main, generates changelog from squash-commit subjects since last tag (conventional prefixes `feat:`/`fix:` already in use — verified in git log), publishes GitHub Release.
5. Post-release: watch production-smoke + `/api/admin/system` once.

## Release checklist (restores + mechanizes the deleted checklist docs)

| Item | Mechanized? |
|---|---|
| CI green on main (all blocking gates, QUALITY_GATES #1–10) | ✅ prerequisite |
| `npm run test:e2e:integration` dispatched + green (real-Supabase resume flow) | Manual dispatch — checklist reminds |
| Payments touched since last release? → dual-order trace done (QUALITY_GATES #23) | Manual ritual |
| Voice touched? → `verify:voice` green + mobile smoke done (QUALITY_GATES #21/22) | Nightly + manual |
| Auth touched? → both `NEXT_PUBLIC_AUTH_V2` states exercised (QUALITY_GATES #24) | Manual until CI matrix |
| Migrations since last release listed + reviewed against invariants | migration_check already gated each PR; checklist is a re-read |
| `/api/admin/system` healthy; no anomalous error trend | Dashboard look |
| Changelog draft reads sensibly (no leaked internal notes) | Human 1-min read |

## Changelog

Generated from squash-merge subjects grouped by prefix (`feat:` → Features, `fix:` → Fixes, rest → Internal). Squash-merge policy (CI_CD_ARCHITECTURE §2) is what makes this clean — one commit per PR, subject = PR title. No CHANGELOG.md file maintained by hand; GitHub Releases is the record (searchable, linked to diffs). A `docs/CHANGELOG.md` mirror is **rejected** — second copy = second drift source.

## Rollback vocabulary

- **Hot rollback** (minutes): Vercel dashboard → previous deployment. For runtime breakage. Does not touch git history or DB.
- **Clean rollback**: `git revert` of the offending squash commit → PR → merge (CI re-validates). For logic errors.
- **Checkpoint rollback** (worst case): identify last release tag → `git revert` range or branch-from-tag + forward-fix. Tags exist precisely to make this a lookup, not an investigation.
- Migrations: never rolled back; corrective forward migration only (existing house rule).
- Every rollback gets a one-paragraph note in the release's GitHub Release comments — lightweight incident memory (feeds the future `docs/RUNBOOK.md`).

## Release ↔ observability tie-in

`VERCEL_GIT_COMMIT_SHA` stamping on log lines (observability logger design, RFC-004) + release tags give "errors by release" on the future dashboard for free. Optional later: release.yml writes a `release_published` row to `product_events` so funnel anomalies can be correlated to releases in SQL.

## What this strategy deliberately omits

Release branches, release candidates, staged rollouts/canaries (Vercel-plan-dependent and overkill at current traffic), release trains, freeze windows. One person cannot operate these and doesn't need to — the preview-soak habit for risky changes (middleware, voice) is the canary.
