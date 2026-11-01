# Security

> Status: CANONICAL
> Last Verified: 2026-11-01
> Verification Scope: Authz, CSP, RLS, campus/admin gates, upload classification
> Authority: Security-relevant house rules

## Purpose

Non-bypassable security posture for agents.

## Current State / Rules

| Control | Rule |
|---|---|
| CSP | Only `next.config.ts` `headers()` (Invariant #8) |
| Canonical host | Triple redirect layers (Invariant #7) |
| Credits | Service-role RPCs only (Invariant #2) |
| `users` UPDATE | `guard_users_privileged_update` allowlist (Invariant #3) |
| Campus | Honor `verification_status`; production ignores blanket auto-approve |
| Admin | `requirePlatformAdmin` (`platform_role` / `ADMIN_EMAILS` / builtin) — including `/api/admin/metrics` |
| Debug routes | `IE_DEBUG_ROUTES=1` **and** platform admin — never any authenticated user |
| Payments | Server amounts; provider entity match before CAS |
| Secrets | Vercel env; never commit; CI placeholders only; no secrets in query strings |
| Resume files | Ownership checks + short-lived signed URLs; positive resume-content classification on upload; bucket `resumes` private (migration 112 on staging + production) |
| Interview complete | Do not trust client `performanceBucket` |
| Free tools auth | ATS / QG / QG-answer / STAR / Prompt Builder server entry points call `requireFreeToolUser()` (`src/lib/security/free-tool-access.ts`) **first**: verified `auth.getUser()` + `hasVerifiedEmail`; `sb-` cookie presence never counts. 401 `AUTH_REQUIRED` · 403 `EMAIL_UNVERIFIED` · 503 `AUTH_UNAVAILABLE`. Public `/tools/*` pages stay crawlable; only the action is gated. Results live in the user's `sessionStorage` — no server-side saved-results endpoint exists. |
| Free tools RL | `checkAndConsumeFreeToolLimit` → one atomic Lua `checkMultiWindowRateLimit`: per-account hourly + daily (Free: ATS 5/15, QG 5/15, answer 10/30, STAR 5/15, Prompt 20/40; paid/campus never below pre-launch limits) + per-IP abuse ceiling (10× Free). LLM tools `failClosed: true` (Redis error, or Upstash unset when `VERCEL_ENV=production`). Never touches mock-interview credits. |
| Campus remind email | Only enrolled org student emails; Zod caps; fail-closed RL |
| Script answer bodies | Server max 12_000 chars (`script-turn-request-schema`) |

- **Local production guard:** `next.config.ts` calls `assertNotLocalProductionTarget` (`src/lib/env/local-production-guard.ts`). Outside Vercel/CI, `next dev`, `build` and `start` fail closed on a production Supabase URL, a production-project Supabase JWT, or a live Razorpay key. It cannot identify production Redis, which has no fixed host in the repo.

## Dependencies

[PAYMENTS](../Core/PAYMENTS.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)

## Failure Modes

Widening users UPDATE · enabling `IE_DEBUG_ROUTES` in prod · trusting webhook event name without amount check

## Verification

Migration review · payment tests · e2e auth · CSP update when adding scripts

## Change Triggers

New third-party script · new privileged column · new admin surface · storage ACL change

## Related Documents

[CODE_ORGANIZATION](CODE_ORGANIZATION.md) · Invariants in [AGENTS.md](../../AGENTS.md)
