# Code Organization

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Folder conventions + edit-risk zones (from AI_BOUNDARIES)
> Authority: Where code lives and what not to touch casually

## Purpose

Domain layout + zone map so agents don’t rediscover risk by trial and error.

## Current State

### Layout

- `src/lib/<domain>/` — business domains (not technical layers)
- `src/app/api/<domain>/` — Route Handlers
- `src/hooks/` — client hooks (many interview/voice)
- `src/components/` — UI; `ui/` primitives
- Tests: `*.test.ts` next to source

### Do-not-edit (without explicit human instruction naming the file)

| Zone | Why |
|---|---|
| Existing `supabase/migrations/*.sql` | Additive-only |
| Host redirect trio (`src/proxy.ts`, `vercel.json`, `next.config`) | Invariant #7; keep proxy under `src/` when using `src/app` (Next 16 discovery) |
| `next.config.ts` CSP `headers()` | Invariant #8 |
| `src/lib/razorpay/**`, `api/payments/**` | Real money |
| `scripts/noindex-audit.ts` build gate | Invariant #6 |
| Credit RPCs / ledger grants | Invariant #2 |
| `guard_users_privileged_update` | Invariant #3 |
| `.github/workflows/**` | Own reviewed task |

### Caution

| Zone | Why |
|---|---|
| `NEXT_PUBLIC_AUTH_V2` paths | Dual auth logic |
| `CAMPUS_WORKSPACE_AUTO_APPROVE` / org-verification | Security hard-stop in prod |
| Voice experimental `tts/stt/audio` pipelines + `core` FSM | Unit-tested only after orchestrator removal; production script UI uses `useMicrophone` + Deepgram — don’t casually delete shared `pcm-capture-graph` / wire experimental stack without a decision |

### Safe-to-edit (normal review)

Marketing content, most components outside voice caution, non-high-risk libs, tests, **docs**.

### Forbidden assumptions

| Myth | Reality |
|---|---|
| `src/lib/openai/` = OpenAI SDK direct | OpenRouter-routed |
| Mistral auto-fallback | Deleted — none |
| `/interview/session/[id]/v2` is script v2.1 | It was V1 voice rewrite — **REMOVED** |
| CI green ⇒ Vercel deploy gated | CI does not gate Vercel |
| `RESUME_OCR_ENABLED` unset = off | Unset = **on** |

## Architecture / Rules

Read AGENTS.md + matching Core doc before High Risk edits. Prefer minimal diffs.

## Dependencies

[AGENTS.md](../../AGENTS.md) · Core docs · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)

## Failure Modes

Editing migrations in place · widening allowlists “temporarily”

## Verification

Zone checklist before first edit of a session on High Risk paths

## Change Triggers

New domain folder · new do-not-edit zone · Auth V2 retirement

## Related Documents

[DOCUMENTATION_GOVERNANCE](DOCUMENTATION_GOVERNANCE.md) · [SECURITY](SECURITY.md)
