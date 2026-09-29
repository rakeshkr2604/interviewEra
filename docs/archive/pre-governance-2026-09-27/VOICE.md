# Voice / Speech Pipeline — InterviewEra

Deep-dive reference for the speech-to-text/text-to-speech pipeline — the most actively-changed subsystem in the repo. Read [CLAUDE.md](../CLAUDE.md) first for critical invariants and working rules. For test-run results and the certification checklist, see [VOICE_PIPELINE_CERTIFICATION.md](VOICE_PIPELINE_CERTIFICATION.md) — this doc covers architecture, not certification status.

---

## Architecture

Two parallel STT engines, mutually exclusive via a **singleton mic-ownership gate** (`src/lib/voice/mic-capture-coordinator.ts`, states `idle|acquiring|active`, owners `keep_alive|pcm|debug_meter|settings_test`) because "Chrome treats concurrent `getUserMedia` + Web Speech as silent input" (in-code comment):

- **Deepgram path** (`src/lib/voice/stt-client.ts::StreamingSTT`) — `@deepgram/sdk`, model `nova-3`, streaming WebSocket, generation-counter guards against stale callbacks after `stop()`. Audio buffered through `stt/pcm-send-buffer.ts::PcmSendBuffer` (ring buffer, ~3s capacity, drops oldest on overflow) until the socket reaches `OPEN`.
- **Web Speech path** (`src/hooks/useSpeechRecognition.ts`, ~1700 lines) — tri-state (`idle|starting|active`), a restart-storm budget (max 3 error-restarts per question), and a stuck-watchdog (10s normal / 45s during an active answer) that silently rebuilds the recognition session.

Supporting layer: `mic-device-monitor.ts` (Bluetooth/device-swap detection), `mic-permission-monitor.ts` (Permissions API revoke detection), `mic-pipeline-telemetry.ts` + `voice-pipeline-diagnostics.ts` (structured metrics + a rule-based failure classifier producing categories like `ZERO_PCM`, `WS_NOT_CONNECTED`), `lifecycle-log.ts` (shared structured logger), `audio-gesture.ts` (mobile audio-context unlock).

**LLM→TTS first-sentence SSE (script engine + legacy dual-agent):** gated by `VOICE_LLM_TTS_STREAMING` / `NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING` (see [docs/FLAGS.md](FLAGS.md)). Server `isLlmTtsStreamingEnabled()` in `src/lib/interview/script-turn-stream.ts` is authoritative for `POST /api/interview/script/turn` and also gates legacy `/api/interview/process-answer`. Client `isClientLlmTtsStreamingEnabled()` only prefers `Accept: text/event-stream`. Unset → JSON fallback (safe default). `/api/tts` passes `ELEVENLABS_OPTIMIZE_LATENCY` (unset → `'3'`) as ElevenLabs `optimize_streaming_latency`.

A newer `core/`/`orchestrator/`/`conversation/`/`tts/` architecture also exists in `src/lib/voice/` alongside the legacy pipeline above, but is not the actively-modified path per current git status — a consolidation decision is pending once the current hardening pass stabilizes.

Certification status: [VOICE_PIPELINE_CERTIFICATION.md](VOICE_PIPELINE_CERTIFICATION.md) — 98/100, "GO (with manual mobile smoke post-deploy)". Chrome desktop is automated-verified; Edge/Firefox/Safari desktop and all mobile browsers are flagged **manual, not run in CI**.

## Testing

- Unit: `mic-capture-coordinator.test.ts` + `.failure-injection.test.ts` + `.stress.test.ts`, `mic-device-monitor.test.ts`, `mic-permission-monitor.test.ts`, `mic-pipeline-telemetry.test.ts`, `stt-transcript.test.ts`.
- Out-of-band verification: `scripts/voice-fix-verify.mjs` (headless Playwright with fake media devices, reproduces both the fixed Deepgram path and the historical Chrome silent-input bug) — **not wired into CI or any npm script**, must be run manually before certifying voice changes. `scripts/regenerate-voice-fixture.mjs` regenerates the fixture WAV this script depends on.

## Technical debt

- A v2 `AudioSessionManager` exists in code but is not wired to production.
- Manual mobile (Chrome Android, Safari iOS) verification is required post-deploy and was last done 2026-07-03 — do not assume CI coverage extends to mobile.

---

## High risk: Speech / voice pipeline

**Why high risk**: most actively-changed subsystem in the repo right now, with a documented history of silent-production-bug classes (concurrent-capture silent input, false "Listening…" UI state, zombie Deepgram connections, transcript duplication/loss).
**Files**: `src/lib/voice/*` (~20+ files), `src/hooks/use{Microphone,SpeechRecognition,MicPipelineLifecycle}.ts`.
**Dependencies**: Deepgram WebSocket API, browser Web Speech API (browser-specific quirks), `micCaptureCoordinator` singleton state.
**Common mistakes**: acquiring `getUserMedia` outside the coordinator; assuming Web Speech and Deepgram can run concurrently; assuming CI Playwright coverage means mobile Safari/Chrome-Android are verified.
**Verification required before changes**: run the unit suite listed above, then manually run `scripts/voice-fix-verify.mjs` (not in CI), then a manual mobile smoke test — do not certify a voice change on unit tests alone.
