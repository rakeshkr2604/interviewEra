# SEO & Analytics — InterviewEra

Deep-dive reference for sitemap/robots infrastructure, programmatic SEO, and the analytics/telemetry stack. Read [CLAUDE.md](../CLAUDE.md) first for critical invariants and working rules. For the sitemap folder-structure diagram and indexability policy table, see [SEO-INFRASTRUCTURE.md](SEO-INFRASTRUCTURE.md) — this doc is the engineering summary, not a duplicate.

---

## SEO architecture

Sitemap is a hand-built route-handler system, not `next-sitemap` (that package is listed in config only for reference — [../next-sitemap.config.js](../next-sitemap.config.js) explicitly says it is not wired into the build; don't add a postbuild step around it without removing the native sitemap route first). `src/app/sitemap.xml/route.ts` is an index pointing to `pages-sitemap.xml`, `blog-sitemap.xml`, `tools-sitemap.xml`, backed by `src/lib/seo/sitemap/registry.ts`.

Programmatic SEO pages live in `src/lib/seo/programmatic/` (~29 files: roles, companies, skills, question registry, per-company hub pages).

`scripts/noindex-audit.ts` is wired into `npm run build` and fails the build if any sitemap URL resolves to noindex metadata, or if any `HIGH_VALUE_INTERSECTIONS` pair is inconsistent. See [SEO-INFRASTRUCTURE.md](SEO-INFRASTRUCTURE.md) and [../PRE_DEPLOY_SEO_CHECKLIST.md](../PRE_DEPLOY_SEO_CHECKLIST.md) for the full indexability policy table.

## Analytics architecture

`src/lib/analytics/` (funnel tracking, GA4 bridge, product-events client, dedupe, experiments) + `src/lib/telemetry/` (`interview-telemetry.ts` — the umbrella system that replaced fragmented `[INTERVIEW]`/`[VOICE]`/`[mic-flow]` log prefixes).

`critical: true` events beacon via `navigator.sendBeacon` to `/api/product-events` (always returns 204, rate-limited 240/min per IP fail-open, max 50 events/64KB per request) so telemetry survives page unload.

GA4 is treated as a client-side backup, not the source of truth — the Razorpay webhook and server-side inserts into `product_events` are authoritative (see `funnel-ga4-bridge.ts` comment). Migration 051 added RLS locking `product_events`/`experiment_assignments` to service-role writes only.

---

## High risk: SEO / indexing

**Why high risk**: SEO is a stated growth channel (programmatic pages, extensive sitemap/robots infrastructure) and the build is gated on it — a bad SEO change breaks `npm run build`, not just search rankings.
**Files**: `src/lib/seo/`, `src/app/{robots.ts,sitemap.xml,*-sitemap.xml}`, `scripts/noindex-audit.ts`.
**Common mistakes**: adding a new programmatic/marketing page without registering it in `src/lib/seo/sitemap/registry.ts`, or setting noindex metadata on a page that's still in the sitemap.
**Verification required**: `npm run audit:noindex` must pass; check `SEO-INFRASTRUCTURE.md`'s indexability policy table for the correct classification of the new route.

## High risk: Analytics / funnel integrity

**Why high risk**: the founder funnel dashboard and payment-completion tracking both depend on `product_events` being durable and non-duplicated.
**Files**: `src/lib/analytics/`, `src/app/api/product-events/route.ts`, `funnel-ga4-bridge.ts`.
**Common mistakes**: firing an event client-side only (GA4) without also persisting server-side to `product_events` — GA4 is documented as a backup, not the source of truth.
