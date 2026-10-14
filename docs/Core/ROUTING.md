# Routing

> Status: CANONICAL
> Last Verified: 2026-10-14
> Verification Scope: Key App Router + API paths for current product + admin interview review + public preparation guides
> Authority: Route map (code wins if drift)

## Purpose

Find the entry file for common surfaces. Not an exhaustive OpenAPI catalog.

## Current State

### App (pages)

| Path | Notes |
|---|---|
| `/interview/script/start` | V2.1 entry |
| `/interview/script/[id]` | Live script session |
| `/interview/script/test` | Script harness (dev/ops) |
| `/onboarding`, `/interview/new` | **Redirect** → `/interview/script/start` |
| `/interview/session/[id]` | **Retired notice** only (not a live V1 engine) |
| `/dashboard`, `/resume`, `/settings`, … | Candidate shell |
| `/prepare` | Logged-in Interview Prep workspace (sidebar). Noindex. Public articles stay on `/resources` |
| `/pricing`, `/blog`, `/resources`, `/interview-questions/**` | Marketing / SEO |
| `/tools/prompt-builder` | Local ChatGPT prompt builder. Public, no account. Usage counts record the goal only. |
| `/resources/chatgpt-interview-preparation` | Local ChatGPT prompt builder + guide. No resume upload. |
| `/resources/hr-interview-answer-framework` | HR question frameworks. Links the existing STAR guide. |
| `/resources/online-assessment-preparation` | Assessment and video-interview preparation. Formats vary by drive. |
| `/college/**`, `/platform/**`, `/admin/**` | Org / platform |
| `/platform/feedback` | Platform-admin feedback inbox |
| `/platform/feedback/interview/[id]` | Platform-admin **read-only** Interview Investigation Center (durable evidence join; not a live session; no credit mutations) |
| `/auth/callback` | OAuth |
| `/report/script/[id]` | V2.1 script reports (candidate-owned) |
| `/report/[id]` | Legacy compatibility reports for historical rows |

**Removed:** `/interview/session/[id]/v2` (V1 voice experiment). Live V1 dual-agent APIs (`/api/interview/start`, `process-answer`, …) deleted.

### API (selected)

| Prefix | Domain |
|---|---|
| `/api/interview/script/*` | V2.1 engine |
| `/api/interview/{answer,complete,abandon,exit-feedback,…}` | Shared / legacy-compatible |
| `GET /api/interview/[id]` | **410 Gone** (V1 session payload retired) |
| `/api/resume/*` | Upload, parse, file |
| `/api/payments/*` | create-order, verify, webhook |
| `/api/stt/*`, `/api/tts` | Voice |
| `/api/product-events` | Funnel beacon ingest |
| `/api/cron/*` | Bearer `CRON_SECRET` (includes `prune-interview-diagnostics` for 90d diagnostic retention) |
| `/api/report/*` | Legacy report generate / PDF |
| `/api/report/script/*` | Script report PDF |
| `GET /api/admin/interviews/[id]` | Platform-admin read-only investigation payload: session, turns, credits, product_events, AI/voice logs, `interview_diagnostic_events`, linked feedback (`requirePlatformAdmin` + service client; no mutations) |
| `POST /api/interview/diagnostics` | Authenticated owner ingest for schema-v1 diagnostic events (best-effort 204; rate-limited; service-role insert after ownership check) |

Long routes: `maxDuration: 60` in `vercel.json` for upload/parse/extract/`script/start` (and related heavy paths).

## Architecture / Rules

- Protected pages gated in `src/proxy.ts` (with `src/app`, keep the file under `src/` — root placement is not discovered on Next 16)
- Rate limits by prefix before heavy work
- Some pages (e.g. `/report/[id]`) also call `getUser()` + `redirect('/login')` as defense-in-depth; retired `/interview/session/[id]` and client `/interview/script/start` depend on the proxy auth gate
- V1 compatibility: `/interview/new` and `/onboarding` **redirect →** `/interview/script/start` (not a login redirect by themselves; unauthenticated callers are stopped by the proxy first)

## Dependencies

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [FLOWS](FLOWS.md) · [INTERVIEW_ENGINE](INTERVIEW_ENGINE.md)

## Failure Modes

Stale docs listing V1 start as primary — treat as archived only.
Unauthenticated `/assets/*.mp4` (or other media) **307 → `/login`** if `mp4`/`webm`/audio are missing from `src/proxy.ts` matcher + static bypass — landing videos show posters only.

## Verification

Grep `src/app` when adding routes; register marketing URLs in sitemap registry.

## Change Triggers

New page/API · removing engine routes · sitemap-facing marketing paths

## Related Documents

[SEO_AEO_GEO](SEO_AEO_GEO.md) · [INTERVIEW_ENGINE](INTERVIEW_ENGINE.md)
