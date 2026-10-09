# Media asset attribution — `public/assets` and `public/avatars`

> Status: INVENTORY (human review required)
> Last Verified: 2026-10-09
> Authority: Engineering inventory only — not a legal opinion

## Purpose

Record known sources and licensing uncertainty for third-party, AI-generated, or founder-supplied media. Brand marks under `public/brand/` and favicons are covered by [`docs/Core/BRAND_ASSETS.md`](../../docs/Core/BRAND_ASSETS.md).

Status values:

- **VERIFIED** — license/ownership evidence recorded in this file
- **FOUNDER ATTESTATION REQUIRED** — file is in active use; founder must confirm rights before marketing launch claims of clearance
- **UNKNOWN** — no evidence in repository

Do not mark an asset VERIFIED without a source URL, purchase receipt, written license, or signed founder attestation with date.

## Fonts (application)

Loaded via `next/font/google` in `src/app/layout.tsx`:

| Font | Typical license via Google Fonts | Status |
|---|---|---|
| Bricolage Grotesque | OFL | VERIFIED (Google Fonts OFL distribution) |
| DM Sans | OFL | VERIFIED |
| JetBrains Mono | OFL | VERIFIED |
| Instrument Serif | OFL | VERIFIED |

Icons: `lucide-react` (ISC) — VERIFIED via package license.

## Asset-level inventory

| Path | Current usage | Source / creator | License / ownership evidence | Attribution | Commercial / redistribution | Talent release | Status |
|---|---|---|---|---|---|---|---|
| `public/avatars/female/meera-ai.mp4` | Landing hero simulator, Meet Interviewers (Meera), timeline | Unknown — not found in repository | None in repo | None recorded | Unknown | Required if identifiable person / likeness | FOUNDER ATTESTATION REQUIRED |
| `public/avatars/female/meera-avatar.png` | Interviewer still / start UI | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/avatars/male/rohan-ai.mp4` | Meet Interviewers / coach / interview UI | Unknown | None in repo | None recorded | Unknown | Required if identifiable person / likeness | FOUNDER ATTESTATION REQUIRED |
| `public/avatars/male/rohan-avatar.png` | Interviewer still / start UI | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/assets/meera-intro.mp4` | Legacy / alternate Meera intro (may be unused after avatar path migration) | Unknown | None in repo | None recorded | Unknown | Required if identifiable | FOUNDER ATTESTATION REQUIRED |
| `public/assets/meera-intro-poster.webp` | Meet Interviewers / timeline poster | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/assets/rohan-intro.mp4` | Meet Interviewers Rohan clip | Unknown | None in repo | None recorded | Unknown | Required if identifiable | FOUNDER ATTESTATION REQUIRED |
| `public/assets/rohan-intro-poster.webp` | Rohan poster | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/assets/female-ai.mp4` | Legacy female AI clip | Unknown | None in repo | None recorded | Unknown | Unknown | UNKNOWN |
| `public/assets/female-avatar-300.{webp,avif}` | Marketing / persona stills | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/assets/female-avatar-600.{webp,avif}` | Marketing / persona stills | Unknown | None in repo | None recorded | Unknown | Likely required | FOUNDER ATTESTATION REQUIRED |
| `public/brand/**` | Logo Package v1 (navbar, favicon, OG) | Founder / design package (see BRAND_ASSETS) | Documented in BRAND_ASSETS.md | Brand SoT | Intended commercial brand use | N/A (marks) | FOUNDER ATTESTATION REQUIRED (confirm package ownership / designer assignment) |

### Safe interim behavior (engineering)

- **Do not delete** Meera/Rohan binaries or break landing references during this audit.
- Public marketing continues to show interviewer media **pending** founder rights confirmation — this is a launch blocker for legal clearance, not a silent license grant.
- If founder cannot attest rights before launch, engineering will switch marketing surfaces to brand-only / still-frame fallbacks in a follow-on PR (no destructive deletes of originals).

## Rules

- Do not delete or replace assets blindly.
- Do not claim Creative Commons or stock-license clearance without the original purchase/receipt.
- Do not assume AI-generated or “founder-supplied” media is automatically licensed for commercial use.
- When rights are confirmed, update this table with source URL, license name, attribution text (if required), attestation date, and attester name.

## Related

[BRAND_ASSETS](../../docs/Core/BRAND_ASSETS.md) · [founder-launch-readiness](../../docs/audits/founder-launch-readiness.md) · [production-trust-hardening](../../docs/audits/production-trust-hardening.md)
