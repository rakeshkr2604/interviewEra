# System Design

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: App Router layout, middleware, auth, DB overview (code + prior ARCHITECTURE)
> Authority: Current application architecture

## Purpose

How InterviewEra is structured end-to-end: route groups, request lifecycle, authz, DB shape, API surface, deployment.

## Current State

Next.js App Router monolith at `interviewera.com`. Interview production path = **V2.1 script engine**. V1 dual-agent **REMOVED**. Auth V2 still dual-path behind `NEXT_PUBLIC_AUTH_V2`.

### Route groups (`src/app/`)

| Group | Role |
|---|---|
| `(auth)/` | login, signup, password reset, college signup |
| `(dashboard)/` | authenticated app (interview, resume, report, settings, …) |
| `(marketing)/` | public site + programmatic SEO |
| `admin/`, `college/`, `platform/` | admin / campus / platform surfaces |
| `auth/` | OAuth callback, confirm, errors |
| `api/` | Route Handlers by domain |

Server Components default; mutations via Route Handlers / Server Actions.

### Request lifecycle (`src/proxy.ts`)

**Location:** `src/proxy.ts` (Next.js 16 rename of `middleware`; required under `src/` when using `src/app`). A root-level `middleware.ts` / `proxy.ts` next to `src/` is **not** discovered — the build writes an empty gate manifest and auth never runs. Export `proxy` (not `middleware`).

1. Host/protocol normalize (www→apex, HTTP→HTTPS)
2. Bot bypass → static bypass → Auth V2 redirects → OAuth `?code=` forward (**except** `/auth/callback` and `/auth/error`, where `code` is the Auth V2 recovery catalogue key, not an OAuth PKCE code)
3. Redis rate limits by path prefix
4. Session refresh when needed → auth gate (unauthenticated document routes → `/login`)

### Auth / tenancy

- Clients: anon browser + cookie `createClient()` + service-role `createServiceClient()`
- Methods: email/password, Google OAuth
- Auth V2 (`NEXT_PUBLIC_AUTH_V2`): structured redirect/error/intent modules when on
- Tiers: individual `plan_tier` · campus RBAC in API guards · platform admin (`platform_role` / `ADMIN_EMAILS`)

### Database (summary)

Supabase Postgres, RLS on every table, serial migrations. Core from `001`: users, resumes, interviews, … Credits via service-role RPCs (`create_interview_with_credit`, `refund_credit`, `add_credit`). V2.1 tables: see [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md).

**Deprecated / unreferenced (historical):** `subscriptions`, `realtime_session_metrics`, roadmap tables, retention-draft tables — do not assume active; DROPs need founder sign-off.

### Deployment

Vercel-native. Build: `next build --webpack && tsx scripts/noindex-audit.ts`. CI advisory vs Vercel deploy: see [Operations/RELEASE.md](../Operations/RELEASE.md).

## Architecture / Rules

- Degrade-don't-fail on user-critical paths
- Rate limit: fail-open on soft routes; fail-closed on interview/resume/STT/payments
- CSP only in `next.config.ts` `headers()` (Invariant #8)
- Canonical host triple-redundant (Invariant #7)
- RLS **and** table GRANTs in same migration (033 lesson)

## Dependencies

Supabase · Upstash · OpenRouter · Deepgram · ElevenLabs · Razorpay · Resend · Vercel

## Failure Modes

| Failure | Behavior |
|---|---|
| Proxy/middleware file at repo root (not under `src/`) or still named `middleware` without `proxy` export | Next 16 may skip or warn; protected pages can lose the shared auth gate |
| Redis down | Fail-open or fail-closed per route risk |
| Stale refresh token | Strip `sb-*` cookies; mark request |
| Auth V2 partial edit | Silent redirect breakage for one flag state |
| PDF serverless assets missing | Prod-only extract failure |

## Verification

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` (includes noindex audit) · after proxy edits, confirm build lists `ƒ Proxy` and `functions-config-manifest.json` has `functions["/_middleware"].matchers` (Next 16 may leave `middleware-manifest.json` empty for `proxy.ts`) — build exit 0 alone is not enough

## Change Triggers

New route group · middleware auth · RLS/grants · CSP / redirects · Auth V2 flag behavior

## Related Documents

[INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [ROUTING](ROUTING.md) · [BACKEND_SCHEMA](BACKEND_SCHEMA.md) · [FLOWS](FLOWS.md) · [CODE_ORGANIZATION](../Guidelines/CODE_ORGANIZATION.md) · [RELEASE](../Operations/RELEASE.md)
