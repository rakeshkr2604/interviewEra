# Resume Pipeline

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Upload/extract/parse + storage signed URL path
> Authority: Resume text extraction and AI parse

## Purpose

Funnel-critical path: file → text → structured `parsed_data`.

## Current State

```
POST /api/resume/upload
  → pdf/parser extractText
  → extraction-pipeline runLayeredTextExtraction
  → quality gate → DB status: parsing
POST /api/resume/parse
  → graceful-parse → OpenRouter parseResume (or regex fallback)
  → status: parsed
```

### Extract fallbacks

1. `pdfjs-dist`
2. `pdf-parse`
3. OCR `tesseract.js` (≤3 pages / 12s / 4MB, 8/hour) if &lt; `MIN_USEFUL_CHARS` (12)

Never hard-fail upload on weak text — degrade. Only `.pdf` / `.txt` (no docx).

### Storage privacy

- Canonical file presence: non-empty `storage_path`
- Download: `GET /api/resume/:id/file` → 120s signed URL; `Cache-Control: private, no-store`
- `file_url` deprecated for product behavior; bucket still public until later phase

Flags: `RESUME_OCR_ENABLED` (unset = **on**), `RESUME_PARSE_FORCE_AI`.

## Architecture / Rules

- Serverless: `next.config.ts` must trace `pdfjs-dist` / `@napi-rs/canvas` assets
- Typed errors: `PDFEncryptedError`, `PDFScannedNoTextError`, …

## Dependencies

pdfjs · pdf-parse · tesseract · OpenRouter · Supabase Storage · [AI_PIPELINES](AI_PIPELINES.md)

## Failure Modes

| Failure | Mitigation |
|---|---|
| Bundling miss on Vercel | Tracing includes + `verify:pdf` |
| Encrypted PDF | Typed error to user |
| OCR cost spike | Bound + opt-out flag |
| Low text | Regex `buildFallbackParsedResume` |

## Verification

`npm run verify:pdf` against fixtures before any extract-chain change.

## Change Triggers

Parser · OCR bounds · `MIN_USEFUL_CHARS` · storage path semantics · new upload route without tracing

## Related Documents

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md) · [PERFORMANCE](../Guidelines/PERFORMANCE.md)
