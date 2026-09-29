# SEO / AEO / GEO

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Sitemap, noindex audit, analytics SoT
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

### Analytics

- Client: GA4 + Clarity + Vercel Analytics
- **SoT for funnel/payments:** server `product_events` (service-role writes). GA4 is backup.
- Critical client events: `sendBeacon` → `/api/product-events` (204)

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
