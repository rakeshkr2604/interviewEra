# InterviewEra — Mobile Interview Hardening Report

**Scope:** Implementation of all P0 and P1 findings from `docs/mobile-interview-audit.md`.
**Validation:** `tsc --noEmit` ✅ · `eslint` (changed files) ✅ · `next build` ✅
**Date:** 2026-05-30

---

## 1. Architecture Report — Before vs After

| Concern | Before | After |
|---|---|---|
| **Telemetry** | 6 fragmented prefixes (`[INTERVIEW]`, `[VOICE]`, `[interview-startup]`, `[mic-flow]`, `[session:lifecycle]`, `[VOICE_DEBUG]`), inconsistent fields, **no path to the server** | Unified `interviewTelemetry()` layer. Every event carries `interviewId / questionIndex / phase / platform / browser / pwa / timestamp / runId`. 9 structured types (`INTERVIEW_FLOW, VOICE, TIMER, SUBMIT, EVALUATION, QUESTION_ADVANCE, PHASE_TIMEOUT, RECOVERY, REPORT_GENERATION`). **Critical events beacon to `/api/product-events`** and survive page unload. |
| **Network** | `api.ts` raw `fetch`, **no timeout** — mobile requests hang forever | `AbortController` budgets: GET 30s, POST 60s. Typed `ApiTimeoutError`, timeout telemetry (critical beacon), caller-signal composition. Orchestrator `process-answer` fetch now bounded (55s). |
| **Stuck states** | `submitting` had no timeout; `feedback`+follow-up relied on one 1.5s timer; backgrounded timer could freeze | `useInterviewRecovery` — evaluation watchdog (45s→fallback), question-advance watchdog (8s→force advance), answering backstop (budget+12s→force submit). All callbacks ref-mirrored (no stale closures). |
| **Refresh safety** | Hard refresh destroyed transcript/phase/timer/skip/follow-up; server knew only submitted answers | `interview-draft` (localStorage, TTL, version, server-reconciled) + `useInterviewDraft`. Restores transcript + timer into `candidate_answering`; `beforeunload` guard; cleared on submit/completion. |
| **Watchdog closures** | Mic-startup watchdog read `recognitionState`/`permissionState`/`micError` from a stale closure | Reads live values via refs (`recognitionStateRef`/`permissionStateRef`/`micErrorRef`). |
| **Onboarding parse** | Fire-and-forget `void fetch('/api/resume/parse')` — silent failure, 75s poll timeout | Awaited with `AbortController` (65s); explicit failure + retry; poll remains completion source of truth. |
| **Prepare poll** | ~58.5s window < 60s server `maxDuration` → false "taking longer" | ~72s window (3×1.5s + 27×2.5s); per-request timeouts (poll 30s, prepare 65s); once-guard cleared on failure for retry. |
| **`/complete` route** | No `maxDuration` — platform could kill slow report generation | `export const maxDuration = 60`. |
| **PWA manifest** | `start_url:"/"`, no `scope`/`id` | `start_url:"/dashboard?source=pwa"`, `scope:"/"`, `id:"/"`. |
| **Mobile layout** | `min-h-screen` (ignores mobile chrome), no safe-area on control bar | `min-h-dvh` ×4; control bar `padding-bottom: calc(1rem + env(safe-area-inset-bottom))`. |
| **Session page concerns** | Cross-cutting telemetry/recovery/persistence inlined in a 2.1k-line monolith | 3 concerns extracted into focused, testable hooks (`useInterviewTelemetry`, `useInterviewRecovery`, `useInterviewDraft`) + 2 lib modules. |

---

## 2. Files Modified

**New (6):**
- `src/lib/telemetry/interview-telemetry.ts` — unified event layer + server beacon.
- `src/app/api/product-events/route.ts` — server telemetry sink (rate-limited, always 204).
- `src/hooks/useInterviewTelemetry.ts` — live-context `track()`.
- `src/hooks/useInterviewRecovery.ts` — evaluation / advance / answering watchdogs.
- `src/hooks/useInterviewDraft.ts` — persist / clear / reconcile / unload guard.
- `src/lib/session/interview-draft.ts` — localStorage draft schema + reconciliation.

**Modified (6):**
- `src/services/api.ts` — AbortController timeouts + `ApiTimeoutError`.
- `src/app/(dashboard)/interview/session/[id]/page.tsx` — integration of telemetry, draft persistence + restore, recovery watchdogs, stale-closure fix, SUBMIT/EVALUATION/TIMER/QUESTION_ADVANCE/REPORT_GENERATION events, `min-h-dvh`, safe-area.
- `src/hooks/useInterviewPrepare.ts` — aligned poll window + per-request timeouts.
- `src/app/(dashboard)/onboarding/page.tsx` — awaited resume parse with explicit failure/retry.
- `src/app/api/interview/complete/route.ts` — `maxDuration = 60`.
- `public/site.webmanifest` — `start_url` / `scope` / `id`.

---

## 3. Mobile Reliability Improvements (resolved audit findings)

**Top-10 highest-risk bugs:**
1. ✅ Refresh loses in-progress answer → draft persistence + restore + reconciliation.
2. ✅ `api.fetch` no timeout → 30s/60s AbortController + orchestrator fetch bounded.
3. ✅ Mic-fallback transcript desync — verified `a0dac33` path; empty-payload blocks now beacon to server.
4. ✅ Timer expires before speech → answering backstop + existing late-transcript retry.
5. ✅ Stale-closure mic-startup watchdog → live refs.
6. ✅ Fire-and-forget resume parse → awaited with explicit failure/retry.
7. ✅ Prepare poll < server timeout → ~72s window.
8. ✅ `submitting` no timeout → 45s evaluation watchdog → graceful fallback.
9. ⚠️ Body scroll-lock orphan — verified the lock/unlock pairing in `DashboardChrome` is already correct (cleanup on `mobileOpen` change + unmount); no orphan path found. Left as-is.
10. ✅ No client telemetry to server → `/api/product-events` beacon for all critical events.

**Priority lists:** P0 (refresh/draft ✅, fetch timeouts + submit recovery ✅, server submit events ✅) and P1 (unified telemetry ✅, evaluation timeout ✅, question-advance watchdog ✅, mic watchdog refs ✅, await resume parse ✅, prepare poll alignment ✅, `beforeunload` ✅, `dvh`/safe-area ✅) are implemented.

---

## 4. Remaining Risks

- **Voice transcript on restore is presented in the text field.** Refresh restore deliberately switches to editable text (the voice gesture is gone post-refresh). The candidate keeps their words + timer but resumes by typing. This is intentional, not a regression.
- **45s evaluation fallback can drop a genuinely-slow (45–60s) real evaluation's inline feedback.** The score is still persisted server-side and appears in the final report; only the inline feedback line is replaced. Threshold matches the audit's prescription.
- **Draft uses `localStorage`.** Survives refresh + PWA relaunch, but is device/browser-local — a different device cannot resume. Acceptable for the refresh-safety goal; cross-device resume is out of scope.
- **Session page is still large (~2.1k lines).** 3 of the 5 named controllers were extracted (telemetry, recovery, draft). The submission/transcript/startup core (6 transcript representations, dual state machines) was **not** extracted — that carries high regression risk to the working desktop flow and the audit itself ranks it P2. Recommended as a dedicated follow-up with snapshot tests first.
- **Telemetry beacon depends on `sendBeacon`/keepalive.** Best-effort by design; a hard crash before flush can still lose the last event.
- **Background-tab throttling** (iOS) is mitigated by the answering backstop but not eliminated — a fully-suspended tab still pauses timers until foregrounded.

---

## 5. Production Readiness Assessment (honest)

| Dimension | Score | Rationale |
|---|---:|---|
| **Reliability** | 8/10 | Refresh no longer destroys progress; no request can hang; every phase has a recovery path. Core monolith remains a regression surface. |
| **Observability** | 8/10 | Unified schema with mandatory fields + server-side critical-event stream. Not yet wired to a dashboard/alerting backend (logs only). |
| **Mobile Readiness** | 7/10 | Major iOS/PWA blockers addressed (timeouts, draft, dvh, safe-area, mic watchdog). Real-device QA across the 7 target platforms still pending; TTS autoplay on iOS remains a best-effort enhancement. |
| **Maintainability** | 7/10 | Cross-cutting concerns now in focused hooks/modules. The submission/transcript state machine is still monolithic. |

**Not claiming 10/10 on anything** — the work materially reduces mobile completion-rate risk and closes every P0/P1 item, but real-device validation and the core state-machine refactor are genuine remaining gaps.
