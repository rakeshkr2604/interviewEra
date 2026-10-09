# Media asset attribution — `public/assets`

> Status: INVENTORY (human review required)
> Last Verified: 2026-10-09
> Authority: Engineering inventory only — not a legal opinion

## Purpose

Record known sources and licensing uncertainty for third-party or stock-like media under `public/assets/`. Brand marks under `public/brand/` and favicons are covered by [`docs/Core/BRAND_ASSETS.md`](../../docs/Core/BRAND_ASSETS.md).

## Fonts (application)

Loaded via `next/font/google` in `src/app/layout.tsx`:

| Font | Typical license via Google Fonts |
|---|---|
| Bricolage Grotesque | OFL |
| DM Sans | OFL |
| JetBrains Mono | OFL |
| Instrument Serif | OFL |

Icons: `lucide-react` (ISC).

## Media files

| Path pattern | Intended use | Source / license | Status |
|---|---|---|---|
| `female-avatar-*.{webp,avif}` | Marketing / interview persona stills | **Unknown — not found in repository** | Needs founder confirmation of commercial rights |
| `meera-intro*`, `rohan-intro*` | Marketing intro video / poster assets | **Unknown — not found in repository** | Needs founder confirmation of talent release + commercial rights |
| Other files in this folder | Mixed marketing | Check git history / design handoff | Review before redistribution |

## Rules

- Do not delete or replace assets blindly.
- Do not claim Creative Commons or stock-license clearance without the original purchase/receipt.
- When rights are confirmed, update this table with source URL, license name, attribution text (if required), and date confirmed.

## Related

[BRAND_ASSETS](../../docs/Core/BRAND_ASSETS.md) · [production-trust-hardening audit](../../docs/audits/production-trust-hardening.md)
