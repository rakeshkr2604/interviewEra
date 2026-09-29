# Testing

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Vitest / Playwright / domain scripts
> Authority: How we prove changes

## Purpose

What tests exist and when each ritual is required.

## Current State

| Layer | Tool | Command |
|---|---|---|
| Unit | Vitest | `npm test` |
| E2E | Playwright chromium | `npm run test:e2e` |
| E2E integration | Real Supabase | `npm run test:e2e:integration` (manual) |
| PDF | Fixtures | `npm run verify:pdf` |
| Voice | Fake media script | `npm run verify:voice` |
| SEO | noindex audit | `npm run audit:noindex` / build |
| Docs | Link/stale check | `npm run verify:docs` |
| Migrations | Namespace | `npm run verify:migrations` |

Weak coverage historically: email providers, `lib/supabase/server.ts` — don’t assume covered.

## Architecture / Rules

- Blocking gates listed in [QUALITY_GATES](../Operations/QUALITY_GATES.md)
- Manual rituals are first-class (payment dual-order, mobile voice, Auth both flag states)
- Never fake a green check for a manual-only ritual
- **E2E base URL:** `resolvePlaywrightBaseUrl` (`src/lib/e2e/playwright-base-url.ts`) — `PLAYWRIGHT_BASE_URL` → `NEXT_PUBLIC_APP_URL` → `http://localhost:$PORT`. Empty/whitespace env values (staging wipe of absent keys to `""`) are treated as absent. Never falls back to a production host.
- **Proxy discovery (auth gate):** after any move/edit of `src/proxy.ts`, `npm run build` must list `ƒ Proxy` and register matchers on `functions-config-manifest.json` → `functions["/_middleware"]` (Next 16 proxy uses Node runtime; `middleware-manifest.json` may be empty — that alone is not a failure). Confirm no “middleware file convention is deprecated” warning. Then confirm unauthenticated document routes redirect to `/login` (unit: `src/lib/auth/middleware-auth-lifecycle.test.ts`; staging smoke: `e2e/interview/guards.spec.ts`).

## Dependencies

CI `ci.yml` · High Risk table in AGENTS.md · Staging: `playwright.staging.config.ts` + `.env.staging.local` (never `.env.local`)

## Failure Modes

“CI passed = mobile voice OK” · skipping razorpay suite on payment edits · empty `PLAYWRIGHT_BASE_URL` treated as a real URL (fixed via `resolvePlaywrightBaseUrl`)

## Verification

Run the domain row from AGENTS.md High Risk table before claiming done.

## Change Triggers

New test harness · changing CI gate levels · new High Risk ritual

## Related Documents

[QUALITY_GATES](../Operations/QUALITY_GATES.md) · [RELEASE](../Operations/RELEASE.md)
