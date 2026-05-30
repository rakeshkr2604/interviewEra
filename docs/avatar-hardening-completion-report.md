# Avatar Hardening Completion Report

**Date:** 2026-05-30  
**Scope:** P0–P2 avatar/audio/video/mic/telemetry fixes from deployment risk reports  
**Validation:** `npm run typecheck` ✅ · `npm run lint` ✅ (0 errors, 1 pre-existing warning in `useTTS.ts`) · `npm run build` ✅ (with `NODE_OPTIONS=--max-old-space-size=8192` on Windows worker OOM)

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/voice/audio-gesture.ts` | `needsAudioGestureUnlock()` → all `platform === 'ios'` (Safari, CriOS, Edge, Firefox, WebViews) |
| `src/lib/voice/avatar-completion.ts` | `AvatarAnsweringReason`: `audio_completed` \| `user_continue` \| `voice_disabled` |
| `src/lib/voice/playback-callbacks.ts` | `PlaybackCallbacks` + `normalizePlaybackArg()` |
| `src/lib/voice/avatar-telemetry.ts` | Critical avatar events → `interviewTelemetry` → `/api/product-events` |
| `src/lib/voice/interview-debug.ts` | `window.__INTERVIEW_DEBUG()` snapshot + platform context |
| `src/hooks/useInterviewAvatarSpeaking.ts` | Authoritative finish reasons, recovery UI, derived `audioActuallyStarted`, no deadline auto-advance |
| `src/hooks/useInterviewPwaLifecycle.ts` | Resume handler + `onAvatarSpeakingResume` during `avatar_speaking` |
| `src/hooks/useInterviewAudio.ts` | `needsUnlock` / gesture unlock |
| `src/hooks/useInterviewVoiceUi.ts` | Explicit mic phases; no “Listening” outside `candidate_answering` |
| `src/hooks/useTTS.ts` | `onPlaybackComplete` only on `onend`; errors → `onPlaybackFailed` |
| `src/hooks/useVoicePlayer.ts` | Same callback contract; `isPlaying` after `source.start()` |
| `src/hooks/useAvatarSync.ts` | `speakQuestion(text, PlaybackCallbacks)` |
| `src/components/avatar/AvatarPlayer.tsx` | Video/lipsync driven by `isSpeaking` (= real audio); server video telemetry |
| `src/app/(dashboard)/interview/session/[id]/page.tsx` | Wiring: recovery UI, PWA retry, debug, telemetry, timer guard |

---

## Bugs fixed (exact)

1. **iOS Chrome unlock gap** — CriOS and all iOS browsers now use the same tap-to-unlock flow as Safari/PWA (`needsAudioGestureUnlock` = iOS platform, not browser name).
2. **Timer without heard audio** — Timer starts only after `enterAnsweringPhase` with `audio_completed`, `user_continue`, or `voice_disabled`; rejected for any other reason; TTS/ElevenLabs errors no longer call `onPlaybackComplete`.
3. **Speaking UI before audio** — Badge, captions, and `AvatarPlayer` use `audioActuallyStarted` (`isSpeaking \|\| elIsPlaying`), not optimistic speak-session flags.
4. **Silent failure stall** — 8s stuck detection → “Avatar audio could not start.” with **Retry Audio** and **Continue Without Audio**; hard deadline auto-advance removed.
5. **PWA dead state** — On `visibilitychange` / `pageshow` / `focus` during `avatar_speaking`, remount video + `retryAudio()` if playback never started.
6. **Contradictory mic UI** — Voice UI returns `idle` until `candidate_answering`; permission/submitting phases explicit; listening only when mic actually active.
7. **Server telemetry** — `avatar_audio_started/completed/failed`, `avatar_video_started/failed`, `avatar_continue_without_audio`, `avatar_unlock_required/success` beaconed as critical `INTERVIEW_FLOW` events.
8. **Field debugging** — `window.__INTERVIEW_DEBUG()` exposes phase, audio/video/mic state, question index, platform.

---

## Remaining known risks

| Risk | Severity | Notes |
|------|----------|-------|
| Real-device WebKit quirks | Medium | Code paths are correct; `speechSynthesis` silent-ignore still possible without `onstart` — recovery UI is the mitigation. |
| ElevenLabs / network | Medium | Fetch/decode failures surface recovery; timer does not auto-start. |
| Build worker OOM on Windows | Low | Default `npm run build` may exit `3221226356` during SSG; succeeds with larger heap; CI/Linux typically fine. |
| `useTTS` eslint warning | Low | Unnecessary `error` dep in `useCallback` (pre-existing). |
| Video decode on low-end Android | Low | `useResilientVideo` recover path; falls back to static portrait. |

---

## Platform status

| Platform | Status | Rationale |
|----------|--------|-----------|
| iPhone Safari | **NEEDS TESTING** | Unlock + recovery implemented; requires on-device gesture/TTS verification. |
| iPhone PWA (standalone) | **NEEDS TESTING** | Same WebKit rules as Safari; PWA resume retry wired. |
| iPhone Chrome (CriOS) | **NEEDS TESTING** | Now included in iOS unlock; was previous P0 gap — must verify on hardware. |
| Android Chrome | **READY** | No iOS gesture gate; standard autoplay/TTS; build/typecheck clean. |
| Android PWA | **NEEDS TESTING** | Resume + video remount; verify lifecycle on installed PWA. |
| Desktop Safari | **READY** | macOS Safari not gated by `needsAudioGestureUnlock` (iOS-only). |
| Desktop Chrome | **READY** | Primary dev path; authoritative timer + callbacks verified in code. |

**Legend:** **READY** = code complete, no known blocker for that platform class. **NEEDS TESTING** = requires physical device QA. **BLOCKED** = none after this pass.

---

## Debug snippet (production support)

```js
// In Safari Web Inspector on device:
JSON.stringify(window.__INTERVIEW_DEBUG?.(), null, 2)
```

---

## Quick test checklist

- [ ] iOS Safari: tap unlock → hear avatar → timer starts after speech ends  
- [ ] iOS CriOS: same as Safari (no silent skip of unlock overlay)  
- [ ] iOS: force TTS fail → recovery buttons → Continue Without Audio starts timer  
- [ ] iOS PWA: background during `avatar_speaking` → foreground → retry or recovery  
- [ ] Android: avatar speaks without tap overlay  
- [ ] Desktop Chrome: ElevenLabs + browser TTS paths complete with `audio_completed`  
- [ ] Server logs: `avatar_unlock_required`, `avatar_audio_started` in product-events  
