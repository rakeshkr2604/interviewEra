# Performance

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: next.config outputFileTracing + serverless PDF scoping + dashboard request folding + client nav isolation + gated TTFB spans + Loop 9 sign-in/admin funnel
> Authority: Perf / bundling guidance

## Purpose

Avoid known prod-only failures and keep serverless packages correct — especially preventing heavyweight PDF infrastructure from bloating every Vercel function.

## Current State / Rules

- `optimizePackageImports` for heavy UI libs
- Images: AVIF/WebP; `minimumCacheTTL` for images
- Redis: rate limit + voice quota only (no general data cache layer)
- Interview routes: respect `maxDuration`
- Analyze locally: `ANALYZE=true ANALYZE_OPEN=false` (Windows: also `NODE_OPTIONS=--max-old-space-size=8192`, then `npx next build --webpack` — `npm run analyze` fails in cmd because the script prefixes `ANALYZE=true`). Opening the HTML report OOMs webpack at ~2 GB.
- Client chrome must not import `@/lib/seo/content/registry` / `programmatic/questions`. Static hrefs live in [`nav-links.ts`](../../src/lib/seo/content/nav-links.ts).
- Recharts on `/dashboard` must load from a Client Component (`ScoreTrendChartSlot`). `ssr: false` is illegal in Server Component `DashboardMain`. Keep the reserved slot height equal to `SCORE_TREND_CHART_HEIGHT_PX` (do not import the Recharts module from the slot file).
- Authenticated dashboard loaders: fold independent reads, prefetch into `loadCandidateSnapshot`, never cache user data across requests — [`docs/performance/`](../performance/OPTIMIZATION-RESULTS.md)
- User-facing lists default to page size 20; lifetime counts stay `count: exact`, not `page.length`
- `/dashboard` header (title + subtitle) must stream without waiting for the interview snapshot. Keep the welcome redirect inside the data `Suspense` child.
- Dashboard chrome must keep `scrollbar-gutter: stable` (classic desktop scrollbars). Do not restore the short centered spinner in `(dashboard)/loading.tsx`.
- Document TTFB on `/dashboard` is layout (`auth.getUser` then chrome queries), not the two-wave page loader, when the header/body `Suspense` streams. Staging-only `PERF_DASHBOARD_TRACE=1` logs `[perf:dashboard]` spans with no user ids — never enable in production.
- Release/rollout: [`docs/performance/RELEASE-READINESS.md`](../performance/RELEASE-READINESS.md)
- Password login: plan_tier + hiring-org lookups run concurrently when both are required; hiring-org is skipped for explicit non-dashboard `next` ([`resolve-password-login-destination.ts`](../../src/lib/auth/resolve-password-login-destination.ts)).
- OAuth callback: session exchange + destination stay on the critical path; attribution / welcome / referral / consent use `scheduleServerlessBackgroundWork` (`after()` / waitUntil) — never bare fire-and-forget.
- Platform admin: request-scoped `getVerifiedPlatformUser` dedupes `auth.getUser`; every `/api/admin/*` still calls `requirePlatformAdmin`.
- Admin funnel/growth: one cohort fetch, chunked `.in()` (100), set-based D7 return-visit / retention; cache-aside + single-flight via `getOrComputeCached` (TTL 120s, `fresh=1` bypass). Lab scripts: `scripts/perf/measure-admin-funnel.ts`, `measure-funnel-before-after.ts`.

### Heavy server-side dependencies must be route-scoped

**Rule:** Never put PDF / native / large asset globs on `'/**'` (or any catch-all) in `outputFileTracingIncludes`.

**Why global tracing is dangerous:** Next.js NFT copies every matched file into **each** serverless function that matches the key. With `'/**': pdfTraceGlobs()`, ~45 MB of `pdfjs-dist` fonts/cmaps + `pdf-parse` + `@napi-rs/canvas` was forced into **~250** functions (health, payments, auth, …). Vercel Functions Storage is the **sum** of those per-function copies — so one mis-scoped include multiplies into multi-GB usage and ~480 MB build caches every deploy.

**InterviewEra PDF architecture:**

```
Route (only these)
  /api/resume/upload
  /api/job-description/extract
  /tools/ats-checker   (+ role/results pages matched by path)
    → domain service (parser / page-count / ATS layout)
      → pdfjs-dist (+ standard_fonts / cmaps)
      → @napi-rs/canvas (Node DOMMatrix globals)
      → pdf-parse (fallback when canvas/pdfjs fail)
```

Unrelated routes must **not** receive those assets.

### Tracing rules (each must answer: why / which route / what breaks)

| Glob | Why | Routes | Runtime reference | Approx size | If removed |
|---|---|---|---|---|---|
| `pdfjs-dist/standard_fonts/**` | NFT does not follow runtime font URLs | PDF routes above | `parser.ts` `standardFontDataUrl` | ~0.7 MB | Helvetica/Times resumes → CORRUPT on Vercel |
| `pdfjs-dist/cmaps/**` | Same for CJK/encoding maps | PDF routes | `parser.ts` `cMapUrl` | ~1.1 MB | Encoded PDFs fail extract |
| `pdfjs-dist/legacy/build/pdf.mjs` + `pdf.worker.mjs` | Entrypoint + fake-worker | PDF routes | dynamic `import('pdfjs-dist/legacy/...')` | ~few MB | Import / worker resolve fails |
| `@napi-rs/canvas/**` | DOMMatrix/Path2D/ImageData on Node | PDF routes | `pdfjs-node-setup.ts` | wrapper + platform `.node` | pdfjs import crashes → fallback/OCR only |
| `pdf-parse/{package.json,index.js,lib/**}` | Fallback engine (not `test/**`) | PDF routes | `extractWithPdfParse` | ~27 MB lib | No secondary engine if pdfjs/canvas fail |
| `src/lib/ai/scripts/*.md` | Script prompts read from disk | script turn/start/auto-structure | `script-loader.ts` | small | ENOENT on turn route |

`serverExternalPackages`: `pdfjs-dist`, `@napi-rs/canvas`, `pdf-parse`, `@react-pdf/renderer` (report export — separate from extract).

### How to validate bundle size

```bash
npm run clean && npm run build
npm run measure:nft          # writes validation-results/nft-baseline.json
npm run verify:nft-pdf       # fails if unrelated NFTs regain PDF assets
npm run verify:pdf           # extract fixtures still work
```

Key signals of regression:

- `Routes with pdfjs` ≫ PDF route count (should be ~3–5, not ~250)
- `/api/health` NFT containing `pdfjs-dist/standard_fonts` or `pdf-parse`
- Unrelated NFT traced size jumping back toward ~50 MB

### How to add a new heavy dependency safely

1. Import it only from a domain module used by the routes that need it (no barrel imports into shared middleware/layout).
2. Add **route-scoped** `outputFileTracingIncludes` entries for assets NFT cannot discover (fonts, WASM, native binaries).
3. Never use `'/**'` / `'/*'` for those globs.
4. Run `npm run verify:nft-pdf` after `build`.
5. Update this doc + `RESUME_PIPELINE.md` if the PDF extract chain changes.

## Dependencies

[RESUME_PIPELINE](../Core/RESUME_PIPELINE.md) · [SYSTEM_DESIGN](../Core/SYSTEM_DESIGN.md) · `next.config.ts`

## Failure Modes

| Failure | Mitigation |
|---|---|
| New PDF-touching route without tracing globs | Prod CORRUPT / missing fonts — add route to `PDF_TRACE_ROUTES` |
| Reintroduce `'/**'` PDF includes | Multi-GB Functions Storage — blocked by `tracing-config.test.ts` + `verify:nft-pdf` |
| Unbounded OCR | Existing OCR bounds / flag |
| Blocking on Redis for voice | Keep fail-open/closed as documented |

## Verification

`npm run verify:pdf` · `npm run verify:nft-pdf` (after build) · `npx vitest run src/lib/pdf/tracing-config.test.ts` · preview soak for PDF upload/ATS/JD extract · bundle analyze when shipping large client pages

## Change Triggers

New serverless native dep · new PDF extract route · any edit to `outputFileTracingIncludes` · cache layer introduction

## Related Documents

[QUALITY_GATES](../Operations/QUALITY_GATES.md) · [RESUME_PIPELINE](../Core/RESUME_PIPELINE.md)
