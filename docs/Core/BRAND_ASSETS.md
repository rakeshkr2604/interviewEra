# Brand Assets

> Status: CANONICAL
> Last Verified: 2026-10-06
> Verification Scope: Logo Package v1 wiring into `public/brand`, favicons, UI chrome, OG, JSON-LD, PWA manifest
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
| Desktop navbar (full) | `monogram-nav.png` + `wordmark-nav.png` + CSS `BrandTagline` | Monogram crop must stop above vertical wordmark (~y860); taller crops squash IE+wordmark into a square |
| Navbar compact / mobile drawer | `icons/ui/interviewera-icon-square.webp` + CSS wordmark | Theme-adaptive text |
| Footer brand block | `primary/ui/interviewera-primary-vertical.webp` | Light plate (caption cropped) |
| Sidebar / auth chip / copyright mark | `icons/ui/interviewera-icon-square.webp` | Compact |
| Favicon / Apple touch / PWA | `public/favicon/*` | Regenerated from clean UI square |
| JSON-LD Organization logo | `/favicon/android-chrome-192x192.png` | `BRAND_ICON_192_PATH` |
| Default OG / Twitter | `/og/default.png` (dynamic) | Embeds UI square + package colors |
| Social profile kit | `public/brand/social/*` | Profile uploads — not 1200×630 OG |

### Preparation rules

1. Do **not** redraw or invent logo variants.
2. Board extracts in `02-icons` / `03-favicon` include white plates and labels — archive originals under `public/brand/favicon-source/` and package folders; serve UI/favicon from cleaned crops.
3. UI crops only remove board chrome (labels) and punch near-white plates to alpha — the IE mark is unchanged.
4. Do **not** mark icons `maskable` unless a dedicated maskable asset exists (package does not provide one).
5. Prefer WebP for UI lockups; PNG for favicon/PWA.

### Theme note

Primary lockups are white-first (dark ink on white). Dark chrome uses a light plate for full lockups, or the purple square mark + CSS `BrandWordmarkSplit` for compact slots.

## Dependencies

`src/components/brand/BrandHomeLink.tsx` · `src/app/layout.tsx` icons · `public/site.webmanifest` · `src/app/og/default.png/route.tsx` · `src/components/seo/StructuredData.tsx`

## Failure Modes

| Failure | Impact |
|---|---|
| Missing `public/brand/icons/ui/*` | Broken navbar/sidebar/auth marks |
| Manifest `purpose: maskable` on non-maskable art | Cropped PWA icons on Android |
| Using board-extract icons with labels in UI | Visible “Icon Only” chrome |
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
