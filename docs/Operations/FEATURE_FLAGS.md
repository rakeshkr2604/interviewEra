# Feature Flags

> Status: CANONICAL
> Last Verified: 2026-10-01
> Verification Scope: Env-gated behaviors (from FLAGS.md); engine default retired; recovery email kill switch
> Authority: Flag registry

## Purpose

Every temporary/permanent env toggle. **New flags without an entry here = review rejection.**

## Current State

### Retired

| Flag | Status |
|---|---|
| `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT` | **Retired** — V1 removed; v2.1 is the only engine (DEC-002). Unset any residual Vercel value; code should not branch on it for product CTAs. |

### Active (selected)

| Flag | Default | Role |
|---|---|---|
| `NEXT_PUBLIC_AUTH_V2` | unset → false | Auth V2 modules; **no measurable exit criteria yet** |
| `SINGLE_PROVIDER_MODE` | false | Warn / disable non-OpenRouter attempts (Mistral already gone) |
| `RESUME_OCR_ENABLED` | unset → **on** | OCR kill switch (`'0'` off) |
| `RESUME_PARSE_FORCE_AI` | unset → quality skip | Force AI parse |
| `IE_UPLOAD_*` / `IE_DEBUG_ROUTES` | off (diag on in dev) | Debug — never leave on in prod |
| `CAMPUS_WORKSPACE_AUTO_APPROVE` | off | Ignored when `VERCEL_ENV=production` |
| `CAMPUS_ORG_APPROVED_EMAILS` | empty | Allowlist (works in prod) |
| `BLOCK_SEARCH_INDEXING` | off in prod | Force noindex |
| `VOICE_LLM_TTS_STREAMING` (+ `NEXT_PUBLIC_`) | unset → off | Script turn SSE first sentence |
| `ELEVENLABS_OPTIMIZE_LATENCY` | unset → `'3'` | TTS optimize level |
| `INTERVIEW_RECOVERY_EMAIL_ENABLED` | unset → **off** | Phase 2 unfinished-interview recovery emails (`'1'` on). Cron registered; dry-run inventory works with flag off; real sends only when enabled and non-dry-run. |
| Staging contract (`APP_ENV`, `EXPECTED_SUPABASE_PROJECT_REF`, …) | fail closed | Staging safety |

Client `localStorage.VOICE_DEBUG='1'` — prod verbose voice logs.

Full narrative for rarely touched flags: archive `FLAGS.md`.

## Architecture / Rules

- Document polarity explicitly (OCR inverted)
- Migration flags need exit criteria
- Server flag authoritative when both server + `NEXT_PUBLIC_` exist for same feature

## Dependencies

[INTERVIEW_ENGINE](../Core/INTERVIEW_ENGINE.md) · [VOICE_PIPELINE](../Core/VOICE_PIPELINE.md) · [SECURITY](../Guidelines/SECURITY.md)

## Failure Modes

Leaving debug routes on · flipping Auth V2 without both-state tests · resurrecting engine default to reintroduce V1

## Verification

Read implementing `flags.ts` before changing; exercise both states for Auth V2

## Change Triggers

Any new `process.env` product branch · retiring a flag

## Related Documents

[DECISIONS](../Core/DECISIONS.md) DEC-002 · archive FLAGS.md
