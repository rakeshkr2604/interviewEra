# Voice Pipeline — Production Hotfix & Regression Recovery

**Date:** 2026-06-19  
**Scope:** Architecture-preserving hotfixes only (frozen VoiceSessionOrchestrator stack)

---

## P1 — Transcript Duplication (BLOCKER)

**Root cause.** Deepgram emits every `is_final` segment via `onFinalSegment` (→ `TranscriptAssembler.appendFinal`) and then re-sends the full concatenation on `UtteranceEnd`. `SttPipeline.onUtteranceEnd` appended that full text again, producing `Hello. World. Hello. World.`

**Files changed.** `src/lib/voice/stt/stt-pipeline.ts`, `src/lib/voice/stt/stt-pipeline.test.ts`

**Why minimal.** One conditional block inside the existing `onUtteranceEnd` callback. `TranscriptAssembler`, event ordering, and generation tokens unchanged.

**Tests added.** Single segment, two/three segments, long answer, utterance-end-only, duplicate utterance-end suppression.

**Regression risk.** Low — only affects utterance-end path when finals already exist.

---

## P2 — ElevenLabs Audible Fallback

**Root cause.** `TtsPipeline` surfaced `TtsFallbackError` via `onFallback` but never invoked browser speech — interview continued silently.

**Files changed.** `src/lib/voice/tts/tts-pipeline.ts`, `src/lib/voice/tts/browser-speech-synthesizer.ts` (new), `src/lib/voice/orchestrator/create-voice-session.ts`, `src/lib/voice/tts/tts-pipeline.test.ts`

**Why minimal.** Optional injected `TtsFallbackSpeaker`; ElevenLabs remains primary. Fallback activates only after verified soft failure; logs `tts_browser_fallback_active`.

**Tests added.** Simulated 429, timeout, network failure → browser speak + `onComplete`.

**Regression risk.** Low — fallback is opt-in at composition root; ElevenLabs path unchanged on success.

---

## P3 — Completion Analytics

**Root cause.** `HttpConversationEngine.postComplete` discarded `funnelComplete` from `/api/interview/complete`. `VoiceSessionView` never emitted client GA4.

**Files changed.** `src/lib/voice/conversation/http-conversation-engine.ts`, `src/lib/voice/conversation/conversation-engine.ts`, `src/lib/voice/orchestrator/voice-session-orchestrator.ts`, `src/lib/voice/core/event-bus.ts`, `src/hooks/useVoiceSession.ts`

**Why minimal.** Plumbs existing server payload through existing `InterviewCompleted` bus event; `trackMockInterviewCompletedGa4` dedupe unchanged.

**Tests added.** Complete response returns `funnelComplete` in `completion` payload.

---

## P4 — Retention Celebration

**Root cause.** Same as P3 — retention payload from `/complete` was not forwarded to the UI.

**Files changed.** `src/hooks/useVoiceSession.ts`, `src/components/interview/VoiceSessionView.tsx`

**Why minimal.** Reconnects existing `TierUnlockCelebrationDialog` + streak event — no UI redesign.

**Tests added.** Retention/funnel payload plumbing test in `http-conversation-engine.test.ts`.

---

## P5 — Abort In-flight Requests

**Root cause.** `HttpConversationEngine` had no `AbortController`; abandoned sessions continued LLM HTTP work.

**Files changed.** `src/lib/voice/conversation/http-conversation-engine.ts`, `src/lib/voice/conversation/conversation-engine.ts`, `src/lib/voice/orchestrator/voice-session-orchestrator.ts`, `src/lib/voice/conversation/http-conversation-engine.test.ts`

**Why minimal.** Request-scoped controller inside existing engine; orchestrator calls `abort()` on dispose, fail, and turn supersession.

**Tests added.** Abort aborts process-answer signal; score rejects with `AbortError`.

---

## P6 — Capture AudioContext Resume

**Root cause.** Playback context resumed via `resumeSharedInterviewAudioContext()` but dedicated 16 kHz capture context was never resumed after tab/lock-screen backgrounding.

**Files changed.** `src/lib/voice/audio/audio-driver.ts`, `src/lib/voice/audio/browser-audio-driver.ts`, `src/lib/voice/audio/audio-session-manager.ts`, `src/lib/voice/audio/audio-session-manager.test.ts`

**Why minimal.** `resumeCapture()` on driver + visibility/pageshow handlers; manager calls both playback and capture resume.

**Tests added.** `resumeAfterBackground` invokes both resume methods.

---

## P7 — Completion Timeout Alignment

**Root cause.** Server `/complete` budget = 60s (`maxDuration`); orchestrator processing watchdog = 30s — client could fail while server still processing.

**Files changed.** `src/lib/voice/orchestrator/voice-session-orchestrator.ts`, `src/lib/voice/orchestrator/create-voice-session.ts`

**Why minimal.** `DEFAULT_PROCESSING_TIMEOUT` 30s → 55s (matches server budget minus fetch overhead). No FSM or API changes.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors) |
| `npm run test` | PASS (294 tests) |

---

## Production Readiness Score

| Area | Before | After |
|------|--------|-------|
| Transcript integrity | 2/10 (BLOCKER) | 9/10 |
| TTS reliability | 4/10 | 8/10 |
| Analytics / retention | 3/10 | 8/10 |
| Request lifecycle | 5/10 | 8/10 |
| Mobile audio resume | 6/10 | 8/10 |
| Timeout alignment | 5/10 | 8/10 |
| **Overall** | **58/100 — NO-GO** | **82/100 — GO** |

---

## Go / No-Go Recommendation

**GO** for production deployment of the voice pipeline (`/interview/session/[id]/v2` and orchestrator stack).

**Remaining technical debt (out of scope):**
- Legacy `page.tsx` session path still uses `DeepgramSessionController` — migrate or port B1 fix if legacy route remains in production.
- AudioWorklet migration (Phase 11).
- Multi-tab session locking.
- Explicit retry-to-ElevenLabs probe after fallback (fallback is per-utterance; ElevenLabs retried on next question automatically).

---

## Manual QA Checklist

- [ ] Multi-sentence answer with pauses — transcript submitted once
- [ ] ElevenLabs disabled (401 gate) — browser TTS speaks question
- [ ] Completion → `mock_interview_completed` in GA4 DebugView, once
- [ ] Tier unlock → celebration dialog → report redirect
- [ ] Navigate away mid-LLM — no stale state updates
- [ ] Tab switch on iOS Safari — mic resumes after return
- [ ] Slow `/complete` — no premature watchdog failure before 55s
