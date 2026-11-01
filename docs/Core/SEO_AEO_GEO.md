# SEO / AEO / GEO

> Status: CANONICAL
> Last Verified: 2026-11-02
> Verification Scope: Sitemap, noindex audit, analytics SoT + optional analytics cookie consent gating + interview milestones / admin Incomplete+COMPLETED + brand OG/JSON-LD logo paths + public preparation guides + programmatic indexing gate (editorial intersections, ATS variants) + title clamp + stable sitemap lastmod + Coming Soon campus/teams indexability
> Authority: Indexing + funnel analytics

## Purpose

Search indexing policy and analytics integrity (GA4 backup vs server events).

## Current State

### SEO

- Hand-built sitemap Route Handlers (`sitemap.xml` → pages/blog/tools indexes) via `src/lib/seo/sitemap/registry.ts`
- Sitemap `<lastmod>` uses stable content dates only. Registry builders never fall back to request-time `new Date()` for URL entries; omit `lastmod` only when no reliable date exists. Tool variants share `TOOL_VARIANT_LASTMOD` until per-variant dates ship.
- `/campus` and `/teams` Coming Soon shells are `noindex, follow` and omitted from the pages sitemap (fail-closed). When admin Redis mode is `live`, metadata becomes indexable and `pages-sitemap.xml` includes the URL. Default IndexNow/audit set excludes both (202 URLs with both Coming Soon).
- Free preparation guides stay public and indexable, listed in the pages sitemap: `/resources/chatgpt-interview-preparation`, `/resources/hr-interview-answer-framework`, `/resources/online-assessment-preparation`. The `/resources` index remains the blog and guide library. The interactive toolkit home is the logged-in `/prepare` page (noindex, sidebar **Practice → Interview Prep**). Nested `/resources/` is public in `src/proxy.ts`. Speaking-practice PDFs are static files at `/resources/guides/*.pdf`, linked from the assessment guide and shown in the `/prepare` carousel. They are not separate HTML sitemap entries.
- Free tools (`/tools/ats-checker`, `/tools/question-generator`, `/tools/star-builder`, `/tools/prompt-builder` and their programmatic role/company/topic variants) keep **public, indexable** content and metadata. Only the interactive action requires a signed-in, verified account (server-enforced, see [SECURITY](../Guidelines/SECURITY.md)); the UI shows `FreeToolAuthGate` with `/signup?next=<path>` / `/login?next=<path>`. Copy must say "Free with a registered InterviewEra account" — never "no sign-up required". Funnel events: `free_tool_auth_gate_shown` (client) and `free_tool_first_completed` (server milestone, once per user, migration `120`, props `{ tool }` only).
- Prompt Builder (`/tools/prompt-builder`) is a free tool (public page; generation requires an account, prompt is still written in the browser after `authorizePromptBuilderRun`) and a logged-in sidebar Tools item. Funnel counts use `tool_usage_events.tool = prompt_builder` with `mode` set to the preparation goal only. Resume text, prompts, and job descriptions are not stored. Migration `118_prompt_builder_usage_events.sql` widens `tool_usage_events_tool_check` to keep `ats`, `question_generator`, and `star`, and adds `prompt_builder`. Page views and signup CTA clicks on `/tools/prompt-builder` stay on the existing `page_view` and `landing_cta_clicked` events and are not counted as prompt runs.
- Programmatic pages: `src/lib/seo/programmatic/`
- Indexing gate SoT: `src/lib/seo/programmatic/indexing.ts` (metadata robots + sitemap both read it). Company × role intersections are indexable **only** when listed in `EDITORIAL_INTERSECTION_KEYS` (bespoke article in `companies/[company]/[role]/page.tsx`); template fallbacks are `noindex, follow` and absent from the sitemap. `/tools/ats-checker/[role]` variants are `noindex, follow` (`isAtsRoleVariantIndexable`). Evidence: [audits/seo-aeo-geo-2026-10-15.md](../audits/seo-aeo-geo-2026-10-15.md)
- Titles: root template `InterviewEra | %s`; `clampTitleSegment` cuts at a word boundary and drops dangling separators/connectives. Long-title pages may set `documentTitleAbsolute` (≤60 chars)
- Live crawl check: `npx tsx scripts/seo/live-crawl-audit.ts [origin] [outFile]` (status, canonical, robots, titles, JSON-LD parse, internal 404s)
- `next-sitemap` config exists for reference — **not** wired into build
- **`scripts/noindex-audit.ts`** runs on `npm run build` — must not be bypassed (Invariant #6)
- Soft-404 risk: catalog dynamics set `dynamicParams = false` where `generateStaticParams` is used
- `BLOCK_SEARCH_INDEXING` or non-production `VERCEL_ENV` → site noindex
- Default OG/Twitter image: `/og/default.png` (embeds Logo Package v1 UI square + brand colors). Organization JSON-LD logo: `BRAND_ICON_192_PATH` → `/favicon/android-chrome-192x192.png`. See [BRAND_ASSETS.md](./BRAND_ASSETS.md).

### Analytics

- Client: GA4 + Clarity + Vercel Analytics / Speed Insights — **optional**, gated by analytics cookie consent (`ie_analytics_consent` in localStorage; banner in root layout). Essential Supabase Auth cookies are never gated.
- **SoT for funnel/payments:** server `product_events` (service-role writes). GA4 is backup.
- Consent UI: `CookieConsentBanner` + `ConsentGatedAnalytics` / consent-aware `Clarity` + `DeferredVercelMetrics`. Reject stops subsequent optional script init; does not erase prior vendor data.
- Critical client events: `sendBeacon` → `/api/product-events` (204)
- Pricing page roadmap notice (`PricingRoadmapCard`, DSA — planned, not sold): Interested / Not interested buttons emit `roadmap_interest_submitted` (`{ item: 'dsa', vote: 'interested' | 'not_interested' }`) via the durable client beacon `POST /api/analytics/funnel-event` (`CLIENT_DURABLE_FUNNEL_PRODUCT_EVENT_NAMES`, server validates `item`/`vote` against a fixed allowlist). One vote per browser, remembered in `localStorage` (`ie_roadmap_vote:dsa`) — not an auth-gated per-user dedupe.
- **Interview lifecycle milestones (durable; at most one row per interview when persistence succeeds — migration 052 unique index; delivery is not guaranteed if the background insert fails):**
  - `interview_started` — V2.1 script start
  - `interview_completed` — after a successful active→`completed` transition (V2.1 turn-complete + script/complete repair; legacy complete route)
  - `interview_abandoned` — after a fresh active→abandoned transition (abandon route / exit-feedback fire-and-forget path; stale cron awaits `persistMilestoneEventOnceAsync` with `source: 'stale_cron'`). At-most-one durable row when persistence succeeds; delivery is not guaranteed; analytics failure does not roll back abandonment. Start-path `create_interview_with_credit` stale abandon does **not** yet emit this event (deferred).
- **Admin All Users (`/api/admin/recent-users`):** INCOMPLETE (API field `pending_interviews`, UI column “Incomplete”) = `interviews.status` in `pending` | `in_progress` | `abandoned`. COMPLETED = `interviews.status === 'completed'` (transactional), **not** `product_events`. LAST INTERVIEW = `started_at` (activity/start); do not use `abandoned.completed_at` as successful completion time.

## Architecture / Rules

- New marketing/programmatic URL → register in sitemap registry or audit fails
- New editorial intersection → add its key to `EDITORIAL_INTERSECTION_KEYS` and its `lastmod` to `EDITORIAL_INTERSECTION_LASTMOD` in the registry
- `scripts/noindex-audit.ts` asserts both index (`VERIFICATION_PATHS`) and expected-noindex (`EXPECTED_NOINDEX_PATHS`) samples
- Do not fire payment_completed only client-side

## Dependencies

noindex-audit · registry · product_events · Invariant #7 host normalization

## Failure Modes

| Failure | Impact |
|---|---|
| Sitemap URL + noindex | Build fail |
| Template duplicates indexable | GSC "Crawled – currently not indexed" growth; diluted quality signals |
| Soft 200 not-found | Crawler soft-404 |
| Duplicate product_events | Funnel inflation |

## Verification

`npm run audit:noindex` · after prod build, `curl -sI` invalid programmatic slug → expect 404

## Change Triggers

New public page · robots/sitemap · product_events schema · analytics vendor (update CSP)

## Related Documents

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [SECURITY](../Guidelines/SECURITY.md) · archive SEO-INFRASTRUCTURE for old tables
