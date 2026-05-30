# InterviewEra — Mobile Interview Deployment Readiness Report

**Date:** 2026-05-30
**Predecessor:** `docs/mobile-interview-hardening-report.md`
**Purpose:** Final validation after the hardening pass — clean toolchain, dead-code audit, flow audit, and per-platform classification.

---

## 1. Toolchain Results (all re-run from clean state)

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ **PASS** — exit 0 | No type errors. |
| `npm run lint` (`eslint .`, whole repo) | ✅ **PASS** — exit 0 | **0 errors, 0 warnings.** |
| `npm run build` (`next build --webpack`) | ✅ **PASS** — exit 0 | Compiled in ~38s; 351/351 static pages generated; `/api/product-events` registered. |

### ESLint errors fixed since the interrupted run
- `useInterviewRecovery.ts` / `useInterviewTelemetry.ts`: **`react-hooks/refs` errors** — "Cannot update ref during render" for callback/context refs. Fixed by moving ref sync into a post-render `useEffect` (React's latest-ref pattern). The watchdogs/`track` read refs inside delayed timeouts/handlers, never during render, so values are always current.
- `page.tsx` load effect: `react-hooks/exhaustive-deps` warning for `ensureQuestionsReady`/`reconcileDraft`/`track` — annotated `eslint-disable-next-line` (all three are stable callbacks; single-shot load is intentional).
- `prepare/route.ts`: **pre-existing** unused import `trackProductEvent` removed (dead-code cleanup).

---

## 2. New Files — Usage Verification

| File | Used by | Status |
|---|---|---|
| `src/hooks/useInterviewTelemetry.ts` | `page.tsx:37,356`; type re-used in `useInterviewRecovery.ts` | ✅ USED |
| `src/hooks/useInterviewRecovery.ts` | `page.tsx:38,1476` | ✅ USED |
| `src/hooks/useInterviewDraft.ts` | `page.tsx:39,364` | ✅ USED |
| `src/lib/telemetry/interview-telemetry.ts` | `useInterviewTelemetry.ts:8`; `services/api.ts:13` | ✅ USED |
| `src/lib/session/interview-draft.ts` | `useInterviewDraft.ts:10`; `page.tsx:40` (types) | ✅ USED |
| `src/app/api/product-events/route.ts` | Beaconed via `PRODUCT_EVENTS_ENDPOINT` in `interview-telemetry.ts:135` | ✅ USED |

## 3. Dead Code / Unused Imports

- Removed `getTelemetryRunId()` from `interview-telemetry.ts` — exported but never imported.
- Removed unused `trackProductEvent` import from `prepare/route.ts`.
- ESLint `no-unused-vars` reports **zero** unused imports/vars across the repo after cleanup.

---

## 4. Session Page Flow Audit (`interview/session/[id]/page.tsx`)

Code-trace verification (logic + types; not real-device execution):

| Flow | Trace | Status |
|---|---|---|
| **Draft restore** | Load fetch computes `restoredIndex` → `reconcileDraft(restoredIndex)` stages a matching draft in `pendingRestoreRef`. Startup handoff (`speech_ready→runtime`) checks the ref: on match, sets `inputMode='text'`, `manualAnswer=transcript`, `skipCount`, `pendingFollowUp`, `answerTimeBudget=budget`, `resetTimer(remaining)`, `setAnswerStartTime(now-(budget-remaining)*1000)`, `setPhase('candidate_answering')`, `startTimer()`. Reconciliation discards drafts the server has moved past. | ✅ READY (logic) |
| **Submit** | Guards (wrong phase / in-flight / empty payload — all now telemetered, empty-payload beaconed). `submitInFlightRef` set, phase→submitting, mic/TTS stopped. `Promise.all([api.post(/answer, 60s), fetch(/process-answer, 55s AbortController)])`. Post-await mount+phase guard. Success → record/feedback/`clearDraft()`. Catch → critical telemetry + fallback feedback + `clearDraft()`. `finally` clears orchestrator timeout + in-flight flag. | ✅ READY (logic) |
| **Question advance** | `handleNextQuestion`: telemeters `QUESTION_ADVANCE`, resets transcript/manual/dg, follow-up→re-enter avatar_speaking same index; last question→complete; else `currentIndex+1`→avatar_speaking. Advance watchdog (8s) force-fires only for stalled follow-ups. | ✅ READY (logic) |
| **Report generation** | `handleCompleteInterview`: phase→completed, `clearDraft()`, `REPORT_GENERATION:complete_started`, `api.post(/complete, 60s)` (route now has `maxDuration=60`). No reportId / throw → critical `complete_failed` + fallback to feedback. Success → `complete_success` + redirect/celebration. | ✅ READY (logic) |
| **Timer** | `useTimer` unchanged; post-TTS `resetTimer(budget)+startTimer()`; expiry effect telemeters `TIMER:timer_expired`→submit. Restore path resumes from `remaining`. Answering backstop (budget+12s) covers throttled `setInterval`. `TimerCircle` denominator = `answerTimeBudget` state (restore-correct). | ✅ READY (logic) |

**Scope verification:** `tsc` passing confirms no use-before-declaration (TDZ) issues — `track`/`clearDraft` (declared ~line 356-364) are in scope at all call sites including `handleCompleteInterview` (740) and the load effect (470+). All hooks (`useInterviewTelemetry/Recovery/Draft`) are called unconditionally at top level, before any early return.

---

## 5. Platform Classification — IMPORTANT HONESTY NOTE

**I cannot execute real-device or browser simulation in this environment.** There is no iOS/Android emulator and the app is not running against real Safari/Chrome here. The table below is a **code-path trace + API-support check**, not an executed test. Anything depending on real browser **media** behavior (mic grant, autoplay, TTS audio, video) is classified **NEEDS TESTING** because only a real device can confirm it. API compatibility was checked: `AbortController`, `sendBeacon`, `Blob` (iOS 11.3+), `crypto.randomUUID` (fallback provided), `localStorage` (try/catch-wrapped), `env(safe-area-inset-bottom)` (iOS 11+), `dvh` (iOS 15.4+/modern).

Legend: **READY** = logic correct & deterministic, no unverifiable media dependency · **NEEDS TESTING** = correct in code but requires real-device confirmation · **NOT FIXED** = known broken.

| Behavior | iPhone Safari | iPhone PWA | Android Chrome | Android PWA | Basis |
|---|---|---|---|---|---|
| Microphone permission | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | Stale-closure watchdog fix is READY in code; real getUserMedia/gesture grant needs a device. PWA standalone has stricter gesture rules. |
| Autoplay / TTS audio | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | **Non-blocking guarantee is READY** (5s fast-fail + hard deadline prevent deadlock); whether audio actually sounds on iOS is device-only. |
| Avatar speaking (no deadlock) | READY | READY | READY | READY | Phase machine fast-fail guarantees exit from `avatar_speaking`; video render itself = NEEDS TESTING. |
| Timer start | READY | READY | READY | READY | Pure JS; 0.5s post-TTS; backstop covers backgrounding. Backgrounded-tab throttling still NEEDS TESTING. |
| Answer submission | READY | READY | READY | READY | Platform-agnostic logic + network timeouts; real flaky-network behavior NEEDS TESTING. |
| Question advance | READY | READY | READY | READY | Platform-agnostic state transitions + advance watchdog. |
| Interview completion | READY | READY | READY | READY | Platform-agnostic; `/complete` `maxDuration=60`; slow-network report gen NEEDS TESTING. |
| **Refresh recovery (draft)** | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | NEEDS TESTING | Logic READY; `localStorage` availability/eviction on iOS private mode + PWA relaunch needs device confirmation (graceful try/catch fallback in place). |

**No behavior is classified NOT FIXED** — every P0/P1 audit item has a corrected code path. The residual risk is entirely real-device **media** confirmation, which is inherent and cannot be discharged in this environment.

---

## 6. Required Pre-Launch Testing (must happen on real devices)

1. iPhone Safari + iPhone PWA: mic grant after gesture, TTS audio presence, refresh-mid-answer → draft restore, full interview completion.
2. Android Chrome + Android PWA: same, plus Deepgram WebSocket path on cellular.
3. Backgrounding test: switch apps mid-answer on iOS, return → confirm answering backstop submits.
4. Flaky-network test: throttle to 3G/offline mid-submit → confirm 60s timeout surfaces, no infinite hang.
5. Server log check: confirm `[client-telemetry]` lines arrive at `/api/product-events` from a real mobile session.

---

## 7. Final Classification Summary

| Category | READY | NEEDS TESTING | NOT FIXED |
|---|---|---|---|
| Toolchain (typecheck/lint/build) | 3 | 0 | 0 |
| New-file usage | 6 | 0 | 0 |
| Session-page flows | 5 | 0 | 0 |
| Platform media behaviors | 0 | per table | 0 |
| Platform logic flows | per table | — | 0 |

**Deployment recommendation:** Code is **build-clean and logically verified — safe to deploy to a preview/staging environment.** Do **not** call it production-validated for mobile until the §6 real-device tests pass. I am not claiming verified success on real devices because I could not run them here.
