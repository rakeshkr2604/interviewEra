# Engineering Workflow

> Status: CANONICAL
> Last Verified: 2026-10-01
> Verification Scope: Multi-phase agent work, deferred push, repository hygiene, pre-push / pre-merge / post-merge gates
> Authority: How agents and humans sequence implementation, Git, and merge — supplements AGENTS.md and RELEASE.md

## Purpose

Define **phase-based delivery**, **deferred push**, **repository hygiene**, and **explicit authorization** for push/merge so intermediate work stays local until the planned change set is complete and reviewed.

Does **not** replace Critical Invariants, High Risk rules, or verification standards in [`AGENTS.md`](../../AGENTS.md). Does **not** change that CI is advisory while Vercel build enforces deploy (see [`RELEASE.md`](../Operations/RELEASE.md)).

## Current State

- Universal agent contract: [`AGENTS.md`](../../AGENTS.md)
- Ship topology: [`RELEASE.md`](../Operations/RELEASE.md) · gate philosophy: [`QUALITY_GATES.md`](../Operations/QUALITY_GATES.md)
- Thin adapters (`CLAUDE.md`, `.cursorrules`) must not invent conflicting push/merge rules — they point here via AGENTS.md

## Architecture / Rules

### Engineering loop (preserved)

```
DISCOVER → VERIFY → PLAN → IMPLEMENT → TEST → AUDIT
  → UPDATE DOCUMENTATION → VERIFY DOCUMENTATION → REPORT
```

**Extensions (gates):**

1. **Phase completion report** after each planned phase (local commit only when the user asked for a commit)
2. **Final repository hygiene** after all planned phases (before push)
3. **Pre-push verification**
4. **Explicitly authorized push** (normal, non-force)
5. **Pre-merge review and hygiene**
6. **Explicitly authorized merge**
7. **Post-merge verification**

Do not silently expand into another roadmap phase ([`MASTER_ENGINEERING_ROADMAP.md`](../../MASTER_ENGINEERING_ROADMAP.md)).

---

### Deferred push (multi-phase work)

**Do not push intermediate phase commits while a multi-phase task is still in progress unless the user explicitly authorizes an earlier push.**

While phases remain open:

| Do | Do not |
|---|---|
| Keep completed phase commits **local** when appropriate | Assume a local commit exists on GitHub or is deployed |
| Continue later phases without pushing | Push “to share progress” without authorization |
| Preserve unrelated dirty / untracked files | Amend, reset, rebase, squash, or rewrite history without explicit authorization |
| Report phase completion with evidence | Force-push or rewrite remote history |

After **all planned phases** for the task are complete:

1. Run a **consolidated final audit** (tests + hygiene + docs impact)
2. Verify branch ↔ remote relationship and **exact outgoing commit/file scope**
3. Confirm the remote has no unexpected commits (if diverged → **stop** and request review)
4. Obtain **explicit user authorization** to push
5. Push with a **normal non-force** push only (`git push` / `git push -u`; never `--force` / `--force-with-lease` to bypass divergence)

A successful local commit is **not** permission to push. A successful push is **not** permission to merge.

---

### Final repository hygiene gate

Run after all planned implementation phases and **before** push. Classify every finding:

| Class | Meaning |
|---|---|
| **Keep** | Required for the change set or existing product |
| **Remove** | Proven safe to delete from the *tracked* change set (or never add) |
| **Update** | Needed fix within approved scope |
| **Investigate** | Ambiguous — report, do not assume |
| **Out of scope** | Unrelated local dirty / user content — leave untouched |

Inspect and classify at least:

- Temporary / debug artifacts, generated test outputs, screenshots/recordings
- Build outputs and caches that should not be committed
- Unused files, dead code, unused dependencies (verify references before removal)
- Duplicate or obsolete docs, stale flags/scripts
- Untracked files; ignored files accidentally generated into the tree
- Secret / credential exposure risk
- Unexpected diffs outside the approved phase scope

**Cleanup safety:**

- Never delete solely because something “looks unused”
- Verify references and runtime/build/test usage before removing code or dependencies
- Do **not** remove user-generated content, screenshots, test evidence, or unrelated local files without **explicit authorization**
- Do **not** discard dirty trees or run destructive cleanup (`git clean -fdx`, hard reset, etc.) without authorization
- Preserve verification evidence when relevant
- Distinguish **tracked repo artifacts** from **local-only** files
- No broad formatting/refactors during hygiene — keep cleanup minimal and reviewable
- Re-run relevant verification after any hygiene edits
- If a cleanup is potentially breaking or ambiguous → **report**, do not guess

---

### Pre-push verification gate

Before any push (and only after authorization), verify:

- Current branch and intended remote/target
- Local vs remote commit relationship (`ahead` / `behind` / diverge)
- Exact outgoing commits (`git log` range) and outgoing file scope (`git diff` / `--stat`)
- Staged, unstaged, untracked, and relevant ignored/generated state
- No secrets / env files / credentials in outgoing commits
- `git diff --check` (and `--cached` when staging)
- Relevant `lint`, `typecheck`, tests, `build` / domain verifies, `verify:docs`, `verify:migrations` as required by AGENTS.md for touched domains
- No unrelated dirty files included; no unexpected generated artifacts
- No unsafe DB/production mutations pending

**Do not push** if any check fails or outgoing scope is unclear. **Never** force-push to bypass divergence or rejection.

---

### Pre-merge repository hygiene gate

After an authorized push, **before** merge:

- Review the full PR diff against its base branch
- Confirm only approved changes; no secrets, local artifacts, accidental generated files, or unrelated work
- Confirm CI / required checks passed (note: CI may be advisory — still treat red checks as blocking for agent-driven merge)
- Resolve or explicitly address open review comments
- Documentation Impact + migration implications addressed
- Branch protection / squash-merge norms per RELEASE.md
- Deployment and rollback implications noted where relevant

**Do not merge** until required checks pass and the user **explicitly authorizes** merge. Push ≠ merge approval.

---

### Post-merge verification

After an authorized merge:

- Confirm target branch points at the expected merge result
- Confirm required CI (and deploy status when deploy is in scope)
- Smoke checks appropriate to the change (honest about what was / was not run)
- Do **not** claim user-facing impact or metric improvement without evidence

---

### Evidence-based Git operations

- Never invent green CI, green tests, or “verified on device” results
- Prefer inspecting `git status`, `git diff`, `git log`, and remote tracking over assumptions
- Docs-only tasks: do not modify `src/`, `e2e/`, or `supabase/migrations` (AGENTS.md)
- Commits: only when the user asks; isolated scope; no amend unless AGENTS/user amend rules are met

## Dependencies

[AGENTS.md](../../AGENTS.md) · [RELEASE](../Operations/RELEASE.md) · [QUALITY_GATES](../Operations/QUALITY_GATES.md) · [DOCUMENTATION_GOVERNANCE](DOCUMENTATION_GOVERNANCE.md) · [TESTING](TESTING.md)

## Failure Modes

| Failure | Mitigation |
|---|---|
| Pushing mid-phase “for backup” | Deferred push policy; ask first |
| Hygiene deletes unrelated local screenshots/content | Out of scope + explicit authorization |
| Force-push after remote diverge | Stop; request review |
| Merge on green local only | Pre-merge gate + explicit auth |
| Claiming deploy/metrics without evidence | Post-merge honesty rule |

## Verification

- Agents follow this doc + AGENTS.md on multi-phase tasks
- `npm run verify:docs` after governance edits
- Human review of PR process against RELEASE.md

## Change Triggers

New agent Git policy · change to squash/branch-protection norms · conflict with RELEASE.md topology

## Related Documents

[AGENTS.md](../../AGENTS.md) · [RELEASE](../Operations/RELEASE.md) · [QUALITY_GATES](../Operations/QUALITY_GATES.md) · [CODE_ORGANIZATION](CODE_ORGANIZATION.md)
