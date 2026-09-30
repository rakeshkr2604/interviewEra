# Interview Engine (V2.1)

> Status: CANONICAL
> Last Verified: 2026-09-30
> Verification Scope: Script engine routes, tables, lifecycle + durable milestones + stale cleanup
> Authority: Production interview path

## Purpose

Document the **current** mock-interview engine: V2.1 script engine. Legacy V1 dual-agent is **REMOVED**.

## Current State

| Fact | Value |
|---|---|
| Engine marker | `interviews.engine = 'v2.1'` |
| Entry UI | `/interview/script/start` |
| Start API | `POST /api/interview/script/start` |
| Session UI | `/interview/script/[id]` |
| Scripts | `SCRIPT_H` (behavioral), `SCRIPT_T` (technical), `SCRIPT_M` (mixed) |

### API surface (`/api/interview/script/`)

| Route | Role |
|---|---|
| `start` | Create interview + credit ownership RPC |
| `session` | Load session state |
| `turn` | Next interviewer turn (JSON or SSE first-sentence) |
| `auto-structure` | Live structure assist |
| `answer-score` | Per-answer scoring (`score-v1.6`) |
| `complete` | Finish interview; backfill scores if needed |
| `report` | Script interview report |

### Tables

- `interviews` (+ v2.1 columns)
- `script_turns`
- `answer_evaluations`
- `script_interview_reports`
- `resume_interview_snapshots`

### Lifecycle authority + durable analytics

- **Authoritative completion** = `interviews.status = 'completed'` (transactional DB state). Admin COMPLETED counts this — **not** `product_events`.
- On successful V2.1 completion (`completeScriptInterviewFromTurn` and `PATCH .../script/complete`), attempt durable `product_events.interview_completed` via `persistMilestoneEventOnce`. Migration 052 unique index keeps **at most one** durable row per interview when persistence succeeds; a persistence failure can still yield zero rows. Analytics failure must not fail completion.
- Turn-path completion UPDATEs only `status IN ('pending','in_progress')` and emits only when a row actually transitioned — abandoned cannot become completed through that helper.
- On abandon (`POST /api/interview/[id]/abandon`, exit-feedback abandon), attempt durable `interview_abandoned` via fire-and-forget `persistMilestoneEventOnce` (at-most-one durable row when persistence succeeds; delivery is not guaranteed). Abandoned rows must not emit `interview_completed`.
- `completed_at` is a **terminal timestamp** (set on both successful complete and abandon). Do not treat `abandoned.completed_at` as “successful completion” in admin LAST INTERVIEW — prefer `started_at` (see `recent-user-interview-stats.ts`).

### Stale active sessions

- Policy: **45 minutes** since `interview_last_activity_at` (`ACTIVE_INTERVIEW_STALE_AFTER_MS` ↔ migrations 096/108/109).
- Cleanup paths: (1) inside `create_interview_with_credit` on next start (status abandon only — **no** `interview_abandoned` milestone in this path; deferred follow-up); (2) proactive cron `GET /api/cron/abandon-stale-interviews` → RPC `abandon_stale_active_interviews` (V2.1 only, no credit refund, `SKIP LOCKED`). The RPC re-checks the stale predicate on the authoritative UPDATE so a recently active session is not abandoned from a stale candidate set.
- **Cron analytics (migration 109):** RPC returns `(interview_id, user_id)` for each successfully transitioned row. The cron helper awaits `persistMilestoneEventOnceAsync('interview_abandoned', { engine: 'v2.1', source: 'stale_cron', ... })` per returned row. Migration 052 keeps **at most one** durable row per interview when persistence succeeds; delivery is not guaranteed. Analytics failure must not roll back or fail a successful abandonment (HTTP 200 with `milestoneFailures` counted).
- Cron is daily on Vercel Hobby (sub-daily forbidden); start-path cleanup still covers users who begin another interview sooner.

### Active interview navigation policy

While a V2.1 session is **active** (`pending` / `in_progress`, and the session UI has not reached local `completed`):

- Ordinary in-app dashboard navigation (sidebar Links, workspace switcher, logout) is **intercepted**. A blocked attempt does **not** abandon the interview and does **not** emit `interview_abandoned` / `interview_completed`.
- The candidate is directed to the existing **Exit** control → `InterviewExitFeedbackModal` (confirmation + optional reason) → abandon / exit-feedback APIs as today.
- Browser `beforeunload` may prompt on refresh/close while active; unload **must not** be treated as durable lifecycle truth (no abandon/analytics from unload). Stale sessions remain the job of activity/heartbeat + 45-minute cleanup.
- Browser Back/Forward is re-pushed to the session URL and shows the same intercept UX (no history loop after the guard is released on leave/complete).
- After UI completion or intentional leave (guard released), normal navigation works again (including report redirect).

### Turn model

```mermaid
sequenceDiagram
  participant UI as /interview/script/[id]
  participant Turn as POST .../script/turn
  participant Score as POST .../answer-score
  participant TTS as /api/tts

  UI->>Turn: next turn (± Accept SSE)
  Turn-->>UI: speech text (+ optional sentence events)
  UI->>TTS: speak
  UI->>Score: approved answer
  Score-->>UI: dimensions + overall
```

- Follow-ups: same LLM call (`is_follow_up: true`), max 2 per parent core, do not consume `question_count`
- Answer context recovered so ack auto-advance cannot wipe the real answer
- Optional LLM→TTS SSE gated by `VOICE_LLM_TTS_STREAMING` (unset → JSON-only)

### Scoring

One LLM call: relevance / content_accuracy / communication_clarity / structure / specificity. Overall in app code. Structure = semantic arc, not keyword match. **Never return null score** — neutral fallback (Invariant #4).

### REMOVED — Legacy V1

| Item | Status |
|---|---|
| Dual-agent (Interviewer + Silent Evaluator) | **REMOVED** |
| `/interview/session/[id]` V1 path + `/api/interview/start|process-answer|…` as production mock | **REMOVED** (historical migrations kept) |
| `/interview/session/[id]/v2` | **REMOVED** — experimental **voice rewrite of V1**, not script v2.1 |
| `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT` | **Retired** — v2.1 is the only engine |
| Legacy `/report/[id]` | May remain for **historical** rows only |

## Architecture / Rules

- Credit start via service-role `create_interview_with_credit` (one active interview / user)
- Degrade dual-agent bookkeeping is gone — script path owns state in `script_turns`
- Voice still uses `micCaptureCoordinator` (Invariant #5)

## Dependencies

[AI_PIPELINES](AI_PIPELINES.md) · [VOICE_PIPELINE](VOICE_PIPELINE.md) · [RESUME_PIPELINE](RESUME_PIPELINE.md) · OpenRouter · credit RPCs · [SEO_AEO_GEO](SEO_AEO_GEO.md) (`product_events` milestones)

## Failure Modes

| Failure | Mitigation |
|---|---|
| Score LLM / parse fail | Neutral dimension defaults; complete still runs |
| Active interview conflict | HTTP 409 from start RPC |
| SSE unsupported / flag off | JSON turn fallback |
| Historical V1 report open | Serve legacy report route if present; do not revive V1 engine |
| Milestone insert fail | Logged; completion/abandon still succeed |

## Verification

- Unit: `src/lib/interview/**`, script API tests, `recent-user-interview-stats`, abandon-stale cron
- Manual: start → turn → score → complete → report on `/interview/script/*`
- Voice: `npm run verify:voice` when mic path touched

## Change Triggers

Script prompt versions · turn/score/complete contracts · `engine` column semantics · new script types · resurrecting any V1 path (forbidden without new DEC) · stale policy / cron · milestone emit sites

## Related Documents

[DECISIONS](DECISIONS.md) · [FLOWS](FLOWS.md) · [BACKEND_SCHEMA](BACKEND_SCHEMA.md) · [ROUTING](ROUTING.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)
