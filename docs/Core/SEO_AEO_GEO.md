# SEO / AEO / GEO

> Status: CANONICAL
> Last Verified: 2026-10-09
> Verification Scope: Sitemap, noindex audit, analytics SoT + optional analytics cookie consent gating + interview milestones / admin Incomplete+COMPLETED + brand OG/JSON-LD logo paths
> Authority: Indexing + funnel analytics

## Purpose

Search indexing policy and analytics integrity (GA4 backup vs server events).

## Current State

### SEO

- Hand-built sitemap Route Handlers (`sitemap.xml` → pages/blog/tools indexes) via `src/lib/seo/sitemap/registry.ts`
- Programmatic pages: `src/lib/seo/programmatic/`
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
- **Interview lifecycle milestones (durable; at most one row per interview when persistence succeeds — migration 052 unique index; delivery is not guaranteed if the background insert fails):**
  - `interview_started` — V2.1 script start
  - `interview_completed` — after a successful active→`completed` transition (V2.1 turn-complete + script/complete repair; legacy complete route)
  - `interview_abandoned` — after a fresh active→abandoned transition (abandon route / exit-feedback fire-and-forget path; stale cron awaits `persistMilestoneEventOnceAsync` with `source: 'stale_cron'`). At-most-one durable row when persistence succeeds; delivery is not guaranteed; analytics failure does not roll back abandonment. Start-path `create_interview_with_credit` stale abandon does **not** yet emit this event (deferred).
- **Admin All Users (`/api/admin/recent-users`):** INCOMPLETE (API field `pending_interviews`, UI column “Incomplete”) = `interviews.status` in `pending` | `in_progress` | `abandoned`. COMPLETED = `interviews.status === 'completed'` (transactional), **not** `product_events`. LAST INTERVIEW = `started_at` (activity/start); do not use `abandoned.completed_at` as successful completion time.

## Architecture / Rules

- New marketing/programmatic URL → register in sitemap registry or audit fails
- Do not fire payment_completed only client-side

## Dependencies

noindex-audit · registry · product_events · Invariant #7 host normalization

## Failure Modes

| Failure | Impact |
|---|---|
| Sitemap URL + noindex | Build fail |
| Soft 200 not-found | Crawler soft-404 |
| Duplicate product_events | Funnel inflation |

## Verification

`npm run audit:noindex` · after prod build, `curl -sI` invalid programmatic slug → expect 404

## Change Triggers

New public page · robots/sitemap · product_events schema · analytics vendor (update CSP)

## Related Documents

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [SECURITY](../Guidelines/SECURITY.md) · archive SEO-INFRASTRUCTURE for old tables
