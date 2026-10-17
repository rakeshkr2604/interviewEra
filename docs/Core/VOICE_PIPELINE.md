# Voice Pipeline

> Status: CANONICAL
> Last Verified: 2026-10-17
> Verification Scope: Importers of `src/lib/voice/**` + script session page + mic coordinator + diagnostic emit points + P0 mic-ready-before-capture fix
> Authority: Speech capture and playback for **current** product path

## Purpose

STT/TTS architecture, mic ownership rules, and verification rituals.

## Current State

### Production path (V2.1 script session)

| Piece | Module / route |
|---|---|
| Session UI | `src/app/(dashboard)/interview/script/[id]/page.tsx` |
| Mic PCM | `useMicrophone` → `pcm-capture-graph` via `micCaptureCoordinator` |
| STT | `DeepgramSessionController` + `stt-client` (`StreamingSTT`) → `/api/stt/*` |
| Diagnostics | Mic/STT failures → `emitInterviewDiagnostic` → `POST /api/interview/diagnostics`; TTS request vs playback failures classified on `onPlaybackFailed`; STT session release → `logSTTSession` → `voice_usage_logs` (best-effort; never blocks voice) |
| TTS | session speak helpers / `useVoicePlayer` → `/api/tts` (ElevenLabs); playback failures ≠ synthesis/request failures in diagnostics |
| Early TTS | optional SSE first-sentence from `POST /api/interview/script/turn` when `VOICE_LLM_TTS_STREAMING` is on |

**Singleton mic gate:** `micCaptureCoordinator` (`idle|acquiring|active`). Chrome treats concurrent `getUserMedia` + Web Speech as **silent input** — never run both (Invariant #5).

| Engine | Role |
|---|---|
| Deepgram (`StreamingSTT`, nova-3) | Primary streaming STT via WS + PCM buffer |
| Web Speech (`useSpeechRecognition`) | Alternate / support path where still wired |
| ElevenLabs via `/api/tts` | TTS; `ELEVENLABS_OPTIMIZE_LATENCY` default `'3'` |

Support: device/permission monitors, pipeline diagnostics (`ZERO_PCM`, `WS_NOT_CONNECTED`, …), `lifecycle-log`, mobile `audio-gesture`.

### Removed with V1

- `voice/orchestrator/` (incl. `create-voice-session`)
- `voice/conversation/` (`HttpConversationEngine` → V1 `process-answer`)
- UI: `VoiceSessionView`, `useVoiceSession`, `/interview/session/[id]/v2`

### Retained under `src/lib/voice/core|tts|stt|audio` (not production UI)

After orchestrator removal, these modules have **unit tests** and **cross-import within the experimental package**, but **no App Router / script-page importer** for:

- `VoiceSessionStateMachine`, `AudioSessionManager`, `SttPipeline`, `TtsPipeline`

**Shared / still on the production path:**

- `voice/audio/pcm-capture-graph` ← `useMicrophone`
- `voice/stt/pcm-send-buffer` ← `stt-client`
- `voice/core/observability` (+ ids/event-bus/disposal) ← experimental tts/stt/audio helpers (and their tests)

Do **not** wire the experimental pipeline into the script page without an explicit Phase-3-style voice decision. Do **not** delete the whole tree in a drive-by cleanup — shared PCM capture must stay.

Chrome desktop: automated via `npm run verify:voice`. Edge/Firefox/Safari + mobile: **manual** — **NOT VERIFIED** in this review.

## Architecture / Rules

- All mic acquisition through coordinator owners (`keep_alive|pcm|debug_meter|settings_test`)
- Generation counters on STT stop to ignore stale callbacks
- Voice quota Redis: fail-open (“don’t block interviews”) on Redis errors
- **Mic-ready gate:** `DeepgramSessionController` fires `onWsOpen` only after `startMic` succeeds (WS open alone must not start the answer timer). Script page thinking→answering uses that callback as `micReady`.
- **Late streams:** `micCaptureCoordinator` stops orphan `getUserMedia` streams that resolve after timeout/abort so exclusive device locks cannot poison retries.
- Durable mic diagnostics include allowlisted `error_name` / `error_kind` / `permission_state` / `retry_count` (not phase/browser only).

## Dependencies

Deepgram · ElevenLabs · browser Web Speech · script turn SSE · Upstash quota · `micCaptureCoordinator`

## Failure Modes

| Class | Symptom |
|---|---|
| Concurrent capture | Silent mic / false “Listening…” |
| Zombie Deepgram WS | Stale transcripts |
| Flag mismatch SSE | Client expects stream, server returns JSON (or reverse) |
| Mobile audio unlock | No TTS until gesture |
| Mic-ready before capture (fixed 2026-10-17) | Warmup `[TIMEOUT]` with empty transcript; timer started on WS open while `getUserMedia` still pending |
| Late timed-out stream (fixed 2026-10-17) | Subsequent acquires fail / silent input after acquire timeout |

## Verification

1. Unit: `mic-capture-coordinator*.test.ts`, device/permission/telemetry/stt tests
2. `npm run verify:voice` (`scripts/voice-fix-verify.mjs`) — not full CI substitute
3. Manual mobile smoke after voice deploys

## Change Triggers

Coordinator · STT/TTS clients · SSE turn path · acquiring mic outside coordinator (forbidden) · any cutover of experimental `voice/{core,tts,stt,audio}` pipeline into production UI

## Related Documents

[INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md) · [RESPONSIVE_BROWSER](../Guidelines/RESPONSIVE_BROWSER.md) · [DECISIONS](DECISIONS.md)
