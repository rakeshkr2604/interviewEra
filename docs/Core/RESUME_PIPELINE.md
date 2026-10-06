# Resume Pipeline

> Status: CANONICAL
> Last Verified: 2026-10-06
> Verification Scope: Upload/extract/parse + content classification + storage privacy + serverless PDF tracing scope
> Authority: Resume text extraction and AI parse

## Purpose

Funnel-critical path: file → text → structured `parsed_data`.

## Current State

```
POST /api/resume/upload
  → size/ext + PDF magic/pages/encrypt checks
  → pdf/parser extractText
  → extraction-pipeline runLayeredTextExtraction
  → validateResumeDocumentText (shared; positive CV signals; reject JD/trackers)
  → storage upload → DB status: parsing (orphan object removed if DB write fails)
POST /api/resume/parse
  → graceful-parse → OpenRouter parseResume (or regex fallback)
  → status: parsed

ATS free tool (server action checkAtsAction) — separate entry, same semantic gate:
  → size/ext + extract (PDF/DOCX/TXT)
  → validateResumeDocumentText before cache/LLM
  → optional JD → validateJobDescriptionDocumentText when ≥40 chars
```

### Extract fallbacks

1. `pdfjs-dist`
2. `pdf-parse`
3. OCR `tesseract.js` (≤3 pages / 12s / 4MB, 8/hour) if &lt; `MIN_USEFUL_CHARS` (12)

Weak extraction may still proceed with `extractionWarning`; empty/garbage/wrong-document-type hard-fail. Only `.pdf` / `.txt` (no docx).

### Content validation

- Classifier: `src/lib/documents/document-classification.ts`
- Shared gate: `src/lib/documents/validate-resume-document-text.ts` — used by interview upload **and** ATS Resume Checker
- Resume slot requires ≥2 resume-pattern hits (or clear `resume` kind); rejects clear JDs and non-resume planners/trackers
- ATS optional JD field uses `validateJobDescriptionDocumentText` (reject resume-as-JD)
- Product upload: `.pdf`/`.txt` only (no docx). ATS free tool also accepts `.docx`
- AI parse treats `<resume_document>` as untrusted data (prompt fencing)

### Storage privacy

- Canonical file presence: non-empty `storage_path`
- Download: `GET /api/resume/:id/file` → 120s signed URL; `Cache-Control: private, no-store`
- `file_url` deprecated for product behavior (may still be dual-written; public object URLs do **not** serve content)
- Migration `112_resumes_bucket_private_and_storage_policies.sql`: bucket `public=false` + own-path storage RLS
  - **Staging** `iiowrzfwemaxytbykjrg`: applied (`20261004055215`)
  - **Production** `plfuvgkycmxcyshrgpgv`: applied (`20261004064336`)

Flags: `RESUME_OCR_ENABLED` (unset = **on**), `RESUME_PARSE_FORCE_AI`.

## Architecture / Rules

- Serverless: `next.config.ts` must **route-scope** `outputFileTracingIncludes` for `pdfjs-dist` fonts/cmaps, canvas, and pdf-parse — **never** `'/**'` (global include caused multi-GB Vercel Functions Storage). Routes: `/api/resume/upload`, `/api/job-description/extract`, `/tools/ats-checker`. Detail: [PERFORMANCE](../Guidelines/PERFORMANCE.md).
- Canonical extract engine: `pdfjs-dist` legacy; `@napi-rs/canvas` supplies Node DOM globals; `pdf-parse` remains a **fallback** only (not the primary path).
- Typed errors: `PDFEncryptedError`, `PDFScannedNoTextError`, …
- Upload rate limit: fail-closed (`upload:{userId}`, 5 / 300s)

## Dependencies

pdfjs · pdf-parse (fallback) · tesseract · OpenRouter · Supabase Storage · [AI_PIPELINES](AI_PIPELINES.md) · [PERFORMANCE](../Guidelines/PERFORMANCE.md)

## Failure Modes

| Failure | Mitigation |
|---|---|
| Bundling miss on Vercel | Route-scoped tracing includes + `verify:pdf` |
| Global PDF tracing reintroduced | `verify:nft-pdf` + `tracing-config.test.ts` |
| Encrypted PDF | Typed error to user |
| OCR cost spike | Bound + opt-out flag |
| Low text | Regex `buildFallbackParsedResume` |
| Non-resume PDF (tracker/JD) | `WRONG_DOCUMENT_TYPE` 422 before storage |
| DB write fails after storage | Best-effort `storage.remove` |

## Verification

`npm run verify:pdf` against fixtures before any extract-chain change.  
After production build: `npm run verify:nft-pdf` (unrelated NFTs must not contain PDF assets).  
Config regression: `npx vitest run src/lib/pdf/tracing-config.test.ts`  
Classifier / shared gate:  
`npx vitest run src/lib/documents/document-classification.test.ts src/lib/documents/validate-resume-document-text.test.ts`  
ATS ordering + semantic rejects:  
`npx vitest run "src/app/(marketing)/tools/ats-checker/ats-pipeline-order.test.ts"`

## Change Triggers

Parser · OCR bounds · `MIN_USEFUL_CHARS` · classifier thresholds · storage path semantics · bucket public flag · new upload route without tracing · any `outputFileTracingIncludes` change

## Related Documents

[SYSTEM_DESIGN](SYSTEM_DESIGN.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md) · [PERFORMANCE](../Guidelines/PERFORMANCE.md)
