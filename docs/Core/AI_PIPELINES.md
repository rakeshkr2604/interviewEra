# AI Pipelines

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: OpenRouter routing, eval, report (code + prior AI_PIPELINE)
> Authority: LLM and scoring pipelines (interview path detail → INTERVIEW_ENGINE)

## Purpose

LLM provider routing, evaluation principles, and report generation. Resume extract/parse → [RESUME_PIPELINE.md](RESUME_PIPELINE.md). Live interview turns → [INTERVIEW_ENGINE.md](INTERVIEW_ENGINE.md).

## Current State

### Provider routing

- Completions: **OpenRouter-only** (`interview-completion.ts`). Directory `src/lib/openai/` is OpenRouter-routed (historical name).
- Router (`openrouter-model-router.ts`): `gpt-4.1-mini` cheap/parse · `gpt-4.1` eval/followup · `gemini-2.5-flash` generation — env-overridable.
- **No Mistral fallback** (Invariant #9). `SINGLE_PROVIDER_MODE` may still warn; does not restore Mistral.
- Retries: 2 attempts, exponential backoff, 429/5xx only; hard-fail 400/401/403/quota. Default attempt timeout ~20s.

### Evaluation

| Path | Behavior |
|---|---|
| V2.1 script | `answer-score` / `score-v1.6` — five dims; overall in app |
| Historical V1 | Removed from production; old rows may still exist |

**Invariant #4:** never persist/return a null/missing score — coerce / all-5 fallback, logged.

### Reports

- Script reports: `script_interview_reports` + generate/aggregate under `src/lib/interview/script-report/`
- PDF: `@react-pdf/renderer`, Pro/Campus gated
- Insights: deterministic (`insight-engine`) — no extra LLM

## Architecture / Rules

- Prompts: versioned fragments (`prompt-registry`), not a templating engine
- Cost: `llm-cost-guard`
- Shared wrapper: `chat-completion-core.completionWithRetries`

## Dependencies

OpenRouter · Zod · interview tables · [VOICE_PIPELINE](VOICE_PIPELINE.md) for TTS streaming of LLM text

## Failure Modes

| Failure | Behavior |
|---|---|
| Provider 5xx/429 | Retry then fail call; UI/score fallbacks apply |
| Bad JSON from model | Coerce / fallback scores |
| Assuming Mistral failover | **Wrong** — none exists |

## Verification

`npm test` on touched AI modules · interview score path smoke · never claim live OpenRouter without calling it

## Change Triggers

Model IDs · retry policy · score schema · report fields · any new provider (requires DEC + CSP/env)

## Related Documents

[INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [RESUME_PIPELINE](RESUME_PIPELINE.md) · [OBSERVABILITY](../Guidelines/OBSERVABILITY.md)
