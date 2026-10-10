# Brand Assets

> Status: CANONICAL
> Last Verified: 2026-10-10
> Verification Scope: Logo Package v1 wiring; dark-chrome transparent purple mark + CSS wordmark (no white plate); squircle reserved for favicon/OG
> Authority: Production brand asset architecture and context mapping

## Purpose

Define where approved InterviewEra logo assets live, which variant each product surface uses, and how board extracts are prepared for dark-theme chrome without inventing new marks.

## Current State

- **Source kit (unmodified):** `InterviewEra_Logo_Package_v1/InterviewEra_Logo_Package_v1/`
- **Served kit:** `public/brand/{primary,icons,social,monochrome,favicon-source,icons/ui}/`
- **Browser / PWA bitmaps:** `public/favicon/` + root `public/favicon.ico`
- **Path constants:** `src/lib/brand/assets.ts`
- **Prepare script:** `npm run prepare:logo-package` → `scripts/prepare-logo-package-v1.mjs`
- **Approved web color approximations:** `#09062D`, `#5B21F4`, `#9B6CFF` (`public/brand/BRAND_COLORS.txt`)

Legacy SVG marks under `public/brand/logos/` and `public/icons/` are **retained** but no longer referenced by production UI.

## Architecture / Rules

### Context → asset mapping

| Context | Asset | Notes |
|---|---|---|
| Desktop navbar (full) | Light: `monogram-nav` + `wordmark-nav` + `BrandTagline`. Dark: `BrandMarkIcon` + `BrandWordmarkSplit` + `BrandTagline` | **No** white plate / ring chip on dark chrome. Monogram crop must stop above vertical wordmark (~y860) |
| Navbar compact / mobile drawer | `BrandMarkIcon` + CSS wordmark | Theme-adaptive text |
| Footer brand block | Light: vertical lockup image only (no CSS ring/plate). Dark: `BrandMarkIcon` + CSS wordmark + tagline | No bordered chip |
| Dashboard / admin / hiring chrome headers | `BrandChromeLockup` (mark + CSS wordmark) | Prefer over wordmark-only |
| Sidebar / auth chip / copyright mark | `BrandMarkIcon` → `monochrome/ui/interviewera-purple-mark.webp` | Transparent purple IE (no squircle plate) |
| Favicon / app icon tile | `icons/ui/interviewera-icon-square.webp` | Purple squircle + white IE — keep for PWA/OG only |
| Sidebar / platform logout | Lucide `LogOut` | Do **not** reuse the brand square as a logout glyph |
| Favicon / Apple touch / PWA | `public/favicon/*` | Regenerated from clean UI square |
| JSON-LD Organization logo | `/favicon/android-chrome-192x192.png` | `BRAND_ICON_192_PATH` |
| Default OG / Twitter | `/og/default.png` (dynamic) | Embeds UI square + package colors |
| Social profile kit | `public/brand/social/*` | Profile uploads — not 1200×630 OG |

### Preparation rules

1. Do **not** redraw or invent logo variants.
2. Board extracts in `02-icons` / `03-favicon` include white plates and labels — archive originals under `public/brand/favicon-source/` and package folders; serve UI/favicon from cleaned crops.
3. UI crops only remove board chrome (labels). Primary lockups may punch near-white plates to alpha. **App icons must not punch near-white before purple-tile extract** — that zeros white IE letter fills and leaves dark-chrome holes; `extractAppIconMark` drops the exterior plate and restores any punched white fills inside the tile.
4. Do **not** mark icons `maskable` unless a dedicated maskable asset exists (package does not provide one).
5. Prefer WebP for UI lockups; PNG for favicon/PWA.

### Theme note

Primary lockups are white-first (dark ink). On **open dark chrome**, do **not** wrap them in a bordered white chip — swap to transparent `BrandMarkIcon` (purple monogram) + CSS `BrandWordmarkSplit` / `BrandTagline` (`surface="chrome"`). Do **not** use the purple squircle app-icon tile in marketing/dashboard chrome. Light chrome may keep package rasters without a plate.

`BrandTagline` default `surface="chrome"` uses `var(--text-primary)`. Do **not** hardcode `BRAND_COLORS.deepNavy` (`#09062D`) on open dark surfaces — that token is for light plates / OG art only.

Components: `BrandHomeLink` · `BrandChromeLockup` · `BrandMarkIcon` · `BrandWordmarkSplit` · `BrandTagline` · `AuthBrandChipIcon`.

## Dependencies

`src/components/brand/BrandHomeLink.tsx` · `src/components/brand/BrandChromeLockup.tsx` · `src/components/brand/BrandMarkIcon.tsx` · `src/lib/brand/assets.ts` · `src/app/layout.tsx` icons · `public/site.webmanifest` · `src/app/og/default.png/route.tsx` · `src/components/seo/StructuredData.tsx`

Do **not** append cache-bust `?v=` query strings to paths consumed by `next/image` unless `images.localPatterns` explicitly allows `search` — Next 16 throws at runtime otherwise.

## Failure Modes

| Failure | Impact |
|---|---|
| Missing `public/brand/icons/ui/*` | Broken navbar/sidebar/auth marks |
| Manifest `purpose: maskable` on non-maskable art | Cropped PWA icons on Android |
| Using board-extract icons with labels in UI | Visible “Icon Only” chrome |
| Punching near-white before app-icon extract | Transparent IE letter holes on dark chrome |
| Full navbar dark-ink rasters on open dark chrome | Monogram/wordmark invisible — use dark branch (mark + CSS) |
| White bordered plate behind navbar lockup | Looks like a chip; rejected for dark marketing chrome |
| Pointing OG at square social PNG only | Wrong aspect for `summary_large_image` |

## Verification

```bash
npm run prepare:logo-package
npm run lint
npm run typecheck
# Confirm paths exist + no live refs to /brand/logos/icon-only.svg
```

## Change Triggers

New logo package · favicon/PWA change · navbar/footer brand lockup · Organization JSON-LD logo · default OG art

## Related Documents

[SEO_AEO_GEO.md](./SEO_AEO_GEO.md) · [DOCUMENTATION_GOVERNANCE.md](../Guidelines/DOCUMENTATION_GOVERNANCE.md) · package README in `InterviewEra_Logo_Package_v1/`
