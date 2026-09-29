# Performance

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: next.config + Redis caching posture
> Authority: Perf / bundling guidance

## Purpose

Avoid known prod-only failures and keep serverless packages correct.

## Current State / Rules

- `optimizePackageImports` for heavy UI libs
- Images: AVIF/WebP; `minimumCacheTTL` for images
- **PDF tracing:** `serverExternalPackages` + `outputFileTracingIncludes` for pdfjs/canvas — missing assets = silent prod break
- Redis: rate limit + voice quota only (no general data cache layer)
- Interview routes: respect `maxDuration`
- Analyze locally: `npm run analyze`

## Dependencies

[RESUME_PIPELINE](../Core/RESUME_PIPELINE.md) · [SYSTEM_DESIGN](../Core/SYSTEM_DESIGN.md)

## Failure Modes

New PDF-touching route without tracing globs · unbounded OCR · blocking on Redis for voice

## Verification

`npm run verify:pdf` · preview soak for middleware/voice · bundle analyze when shipping large client pages

## Change Triggers

New serverless native dep · new long route · cache layer introduction

## Related Documents

[QUALITY_GATES](../Operations/QUALITY_GATES.md)
