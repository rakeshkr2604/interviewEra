# AI Pipeline — InterviewEra

Deep-dive reference for LLM provider routing, resume parsing, the dual-agent interview lifecycle, evaluation, and report generation. Read [CLAUDE.md](../CLAUDE.md) first for critical invariants and working rules.

---

## LLM provider routing

`src/lib/ai/interview-completion.ts` is explicitly **OpenRouter-only** (header comment: "no direct OpenAI SDK, no Mistral here"), despite the legacy directory name `src/lib/openai/` (actually OpenRouter-routed code) still existing alongside `src/lib/openrouter/` — a naming mismatch, not a functional bug, worth cleaning up eventually.

Model routing (`src/lib/ai/openrouter-model-router.ts`): `openai/gpt-4.1-mini` for cheap/parsing ops, `openai/gpt-4.1` for evaluation/followup, `google/gemini-2.5-flash` for question generation — all env-overridable.

There is no Mistral fallback — `src/lib/mistral/client.ts` was deleted 2026-07-05 (zero importers, never wired into the completion chain). `isSingleProviderMode()` (`FallbackDisabledError` when true) still gates `provider-policy.ts`'s OpenRouter-only filtering; do not assume any non-OpenRouter fallback exists.

Retry/timeout (`src/lib/ai/chat-completion-core.ts::completionWithRetries`): 2 attempts, exponential backoff, retries only on 429/5xx, hard-fails immediately on 400/401/403/insufficient_quota, per-attempt `AbortController` timeout (default 20s). Prompts are versioned fragments composed by string concatenation (`src/lib/ai/prompt-registry.ts`), not a templating engine. Cost gating via `src/lib/ai/llm-cost-guard.ts`.

## Resume parsing flow

`api/resume/upload` → `src/lib/pdf/parser.ts::extractText` → `src/lib/resume/extraction-pipeline.ts::runLayeredTextExtraction` → quality gate → DB insert (`status: parsing`) → `api/resume/parse` → `src/lib/resume/graceful-parse.ts::parseResumeGracefully` → `src/lib/openai/parse-resume.ts::parseResume` (OpenRouter-routed) → `parsed_data`, `status: parsed`.

Fallback chain: `pdfjs-dist` primary → `pdf-parse` if pdfjs fails → OCR via `tesseract.js` (bounded to 3 pages / 12s / 4MB, rate-limited 8/hour) if both yield fewer than `MIN_USEFUL_CHARS` (12, an explicitly-flagged low "security floor"). `runLayeredTextExtraction` never hard-fails — it accepts degraded text rather than rejecting the upload. At parse time, very-low-quality text skips the AI call entirely and falls back to pure regex parsing (`fallback-parse.ts::buildFallbackParsedResume`). Only `.pdf`/`.txt` accepted — no docx support.

### Resume file download (storage privacy Phase 1)

`GET /api/resume/:id/file` is the authenticated download compatibility layer: session required, `resumes.user_id` ownership check, path ownership check on `storage_path`, then a **120s** Supabase `createSignedUrl`. Signed URLs are never written to the database and responses send `Cache-Control: private, no-store`. The `resumes` bucket remains **public** in Phase 1 — existing `file_url` public links continue to work; this endpoint never reads `file_url` for access. Helper: `src/lib/resume/signed-file-url.ts`.

### Resume storage_path backfill (Phase 2)

Operator script `scripts/backfill-resume-storage-path.ts` recovers `storage_path` from `file_url` via deterministic parser `parseStoragePathFromFileUrl` (default dry-run; `--apply` writes only rows whose Storage object is listed as present). Does not change bucket permissions, remove `file_url`, or alter API behavior. Rollback SQL is emitted under `tmp-lh/backfill-resume-storage-path/rollback.sql`.

### Phase 2.5 — no runtime dependence on durable public `file_url`

- Canonical presence: `hasFile` ⇔ non-empty `storage_path` (`resumeHasFile`).
- File bytes: clients call `GET /api/resume/:id/file` (see `fileDownloadPath` on list/version JSON). Signed URLs are minted only on that request (120s), never embedded in list/version payloads.
- `file_url` / response `fileUrl` remain for backward compatibility and upload dual-write, but are **deprecated** and must not drive product behavior. Bucket stays public until a later Phase 3.

## Interview lifecycle — dual-agent conversation

**Production mock path (v2.1 script engine):** `POST /api/interview/script/turn` generates each interviewer turn from SCRIPT_H / SCRIPT_T / SCRIPT_M. Adaptive follow-ups are the same LLM call (`is_follow_up: true`, max 2 per parent core question, do not consume `question_count`). Candidate-answer context is recovered in `follow-up-context.ts` so acknowledgment auto-advance cannot replace the answer with ack speech. No extra classification LLM call. Optional LLM→TTS first-sentence SSE (`script-turn-stream.ts` / `script-turn-sse-client.ts`) is gated by `VOICE_LLM_TTS_STREAMING` — unset means JSON-only turns (see [docs/FLAGS.md](FLAGS.md)).

**Legacy v1 path** (not SCRIPT_H/T/M): **Agent 1** ("Interviewer" persona, `interviewer-personas.ts` — Meera/Rohan, ids `priya`/`arjun`) asks questions and generates follow-ups. **Agent 2** ("Silent Evaluator", `src/lib/ai/agent-evaluator.ts::analyzeAnswer`) scores each answer on confidence/technical_depth/specificity/communication_clarity and recommends a follow-up type, which Agent 1's `followup-generator.ts` consumes (template-first, deterministic; LLM only for "challenge" follow-ups).

Flow: `api/interview/start` creates `interviews`/`questions` rows → `api/interview/process-answer` calls `interview-orchestrator.ts::processAnswer` (load/create `conversation_states` → `analyzeAnswer` → recompute difficulty/rapport → generate follow-up or move on) → `suggestNextQuestion` picks the next bank question scaled to difficulty → `api/interview/complete` backfills any missing evaluations with neutral 5/10 scores before calling `aggregateReport`. State-table failures are explicitly treated as non-fatal — the interview must not break because of dual-agent bookkeeping.

Tables: `conversation_states`, `answer_analyses`, `followup_questions` (migration 020), `dialogue_history` jsonb (021), speech metrics on `answers` + `summary` on `reports` (022).

## Evaluation pipeline

**Script engine (v2.1, production mock path):** `src/lib/interview/answer-score/` (`score-v1.6`) scores each approved answer in one LLM call across relevance / content_accuracy / communication_clarity / structure / specificity. Structure is semantic (STAR meaning or technical arc of the answer given) — not keyword/label matching. Missing the asked scenario is relevance, not a structure-zero. Optional textbook extras must not be treated as required. Overall is computed in app code. A live regex strip (`live-answer-structure.ts`) is provisional UI only.

**Legacy path:** `src/lib/openai/evaluate-answer.ts` (OpenRouter-routed), LLM-only scoring across 5 weighted dimensions: `communication_clarity: 0.2, technical_depth: 0.25, answer_structure: 0.2, confidence: 0.15, relevance: 0.2`. Parsing: Zod fast-path, then a self-healing `coerceEvaluation()` that defaults any missing dimension to neutral 5 (logged). `api/interview/answer` inserts an all-5 fallback evaluation with a 2-attempt retry on any exception — the dominant design principle here is **never let an AI/parse failure produce a null score** (see [CLAUDE.md Critical Invariant #4](../CLAUDE.md#critical-invariants)).

## Report generation

PDF via `@react-pdf/renderer` (`src/components/report/ReportPDF.tsx`, rendered in `api/report/export-pdf`, gated to Pro/Campus tiers). `src/lib/report/insight-engine.ts::generateInsights()` is **deterministic, zero extra AI calls** — regex-mined behavioral patterns, hand-rolled normal-CDF benchmarking against hardcoded distributions. Web radar chart uses `recharts`; the PDF draws manual bars, not an embedded chart. Missing evaluations render as an explicit "Evaluation unavailable" string rather than being silently omitted.

---

## High risk: Resume / PDF parsing

**Why high risk**: the entire funnel (signup → resume upload → interview) depends on text extraction succeeding on real-world messy PDFs (scanned, encrypted, non-standard fonts). Bundling regressions live in `next.config.ts` — see [ARCHITECTURE.md's PDF bundling risk](ARCHITECTURE.md#high-risk-pdf-bundling--serverless-tracing).
**Files**: `src/lib/pdf/parser.ts`, `src/lib/resume/extraction-pipeline.ts`, `scripts/verify-pdf-extract.ts`, `tests/fixtures/pdf/`.
**Common mistakes**: lowering `MIN_USEFUL_CHARS` without understanding it's a deliberate security floor, not an arbitrary constant.
**Verification required**: `npm run verify:pdf` against the checked-in fixtures before any change to the extraction chain.
