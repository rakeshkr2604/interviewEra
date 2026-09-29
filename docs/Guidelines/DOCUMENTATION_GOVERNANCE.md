# Documentation Governance

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Governance process for this repo
> Authority: Mandatory doc impact contract

## Purpose

Keep canonical docs accurate when code/schema/ops change. Prevent a second “deleted but still linked” incident.

## Current State

- Live tree: `AGENTS.md` + `docs/{INDEX,Core,Guidelines,Operations}`
- Historical: `docs/archive/**`
- Verifier: `npm run verify:docs`

## Architecture / Rules

### Impact contract (every change set)

| If you change… | Update… |
|---|---|
| Interview engine / routes | `Core/INTERVIEW_ENGINE`, `ROUTING`, `FLOWS`, maybe `DECISIONS` |
| LLM / scoring / report | `Core/AI_PIPELINES` |
| Voice / mic / TTS | `Core/VOICE_PIPELINE` |
| Resume / PDF | `Core/RESUME_PIPELINE` |
| Payments / plans | `Core/PAYMENTS` |
| Schema / RLS / RPC | `Core/BACKEND_SCHEMA` + `Guidelines/DATABASE_MIGRATIONS` |
| Flags | `Operations/FEATURE_FLAGS` |
| CI / release | `Operations/RELEASE`, `QUALITY_GATES` |
| Invariants / high-risk | `AGENTS.md` (+ thin adapters if needed) |
| Doc structure | `docs/INDEX.md` |

### Header required on every canonical doc

```
# Title
> Status: CANONICAL
> Last Verified: YYYY-MM-DD
> Verification Scope: ...
> Authority: ...
```

Then: Purpose · Current State · Architecture/Rules · Dependencies · Failure Modes · Verification · Change Triggers · Related Documents.

### Archive rules

- Prefer **move** to `docs/archive/pre-governance-YYYY-MM-DD/` over delete
- Never use archive as SoT
- Stale strings (`PostHog`, `Zustand`, `src/lib/mistral/`) allowed **only** in archive

## Dependencies

[AGENTS.md](../../AGENTS.md) · [INDEX](../INDEX.md) · `scripts/verify-docs.ts`

## Failure Modes

Doc-only claims without code check · updating CLAUDE.md but not AGENTS.md · leaving broken links outside archive

## Verification

`npm run verify:docs` — FAIL on broken local links to expected live paths; WARN on stale strings outside archive.

## Change Triggers

Any new canonical file · governance process change · verifier rules

## Related Documents

[CODE_ORGANIZATION](CODE_ORGANIZATION.md) · [DECISIONS](../Core/DECISIONS.md)
