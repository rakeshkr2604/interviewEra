# Feature Flags Registry — InterviewEra

Every environment-variable-gated or runtime-toggle behavior in the codebase, verified by reading each implementing file directly (2026-07-05). This is the registry required by [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md)'s standing rule #4: **a new flag without an exit-criteria entry here is a review rejection.** For the existing flags below, most predate this rule — their missing exit criteria are stated honestly, not retrofitted.

Two categories exist and are labeled per flag: **Migration/Experiment** (should eventually be removed once its condition is met) and **Permanent operational toggle** (a standing safety valve or debug switch, not expected to be removed — "exit criteria" doesn't apply the same way).

---

## Staging execution safety contract

- **Variables**: `APP_ENV`, `EXPECTED_SUPABASE_PROJECT_REF`, `STAGING_ENV_SOURCE`, `ALLOW_STAGING_EMAIL`, `STAGING_APPROVED_EMAIL_FROM`, and `STAGING_LLM_MODE`.
- **Location**: `src/lib/env/staging-environment.ts`; used by `playwright.staging.config.ts`, staging integration setup, and the Razorpay webhook runtime isolation guard (`evaluateWebhookSupabaseIsolation` — when `APP_ENV=staging` or `VERCEL_ENV=preview`).
- **Default state**: absent → staging E2E fails closed. Local staging loads only `.env.staging.local`; `STAGING_ENV_SOURCE=injected` permits future CI/Vercel environment injection without reading a local file.
- **Purpose**: prove the certified staging Supabase target, reject the production project and live Razorpay keys, keep email disabled unless explicitly approved, and require either disabled LLM use or an explicit non-production key.
- **Category**: Permanent operational safety contract.
- **Planned removal criteria**: N/A. These checks must remain while live staging integration tooling exists.

---

## `NEXT_PUBLIC_AUTH_V2`

- **Location**: `src/lib/auth/flags.ts::isAuthV2Enabled()` — `process.env.NEXT_PUBLIC_AUTH_V2 === '1'`
- **Default state**: unset → `false` (legacy auth path active)
- **Purpose**: gates the Auth V2 migration — when on, redirect-destination resolution, error-code normalization, and invite-token handling route through newer, more structured modules (`resolve-destination.ts`, `auth-errors.ts`, `auth-intent.ts`); legacy inline logic runs when off. Also changes `middleware.ts` redirect behavior for `/college/signup` and legacy `?error=` params.
- **Owner**: Unknown — not verified (solo founder is the de facto owner of every flag in this repo; no per-flag ownership record exists anywhere).
- **Category**: Migration flag (Temporary in intent).
- **Planned removal criteria**: **No measurable exit criteria found in the repository.** `docs/ARCHITECTURE.md` states an intent — "Do not remove the legacy path until V2 is fully rolled out and confirmed" — but "fully rolled out and confirmed" is not tied to a rollout percentage, dashboard, date, or test result anywhere. This is the exact gap CLAUDE.md's High Risk Systems table flags ("two auth code paths coexist behind a flag"). **Action needed**: the founder should define what "confirmed" means (e.g., N days at 100% with zero auth-error-rate regression) — until then this flag has no exit path, only an exit intent.
- **Current production value**: Unknown — not verified (Vercel dashboard, not in repository).

## `SINGLE_PROVIDER_MODE`

- **Location**: `src/lib/ai/single-provider-mode.ts::isSingleProviderMode()` — `process.env.SINGLE_PROVIDER_MODE === 'true'`
- **Default state**: unset → `false`
- **Purpose**: when `true`, logs a loud cold-boot warning ("OpenRouter-only completions") and any code path that checks it (`src/lib/mistral/client.ts`, `src/lib/ai/provider-policy.ts`) throws `FallbackDisabledError` instead of attempting a Mistral/direct-OpenAI fallback. In practice this is close to moot: `src/lib/mistral/client.ts` has zero importers outside itself (CLAUDE.md Invariant #9), so the guard this flag controls never fires regardless of the flag's value — nothing calls the guarded code path either way.
- **Owner**: Unknown — not verified.
- **Category**: Ambiguous. The code comment calls it an "MVP launch banner," suggesting Temporary/launch-era, but no repository document states a condition for turning it off or removing it, and no plan exists for building a live multi-provider fallback that would make the flag meaningful again.
- **Planned removal criteria**: **None found.** Given `lib/mistral/` is dead code (scheduled for deletion in MASTER_ENGINEERING_ROADMAP.md Phase 1B.1), this flag's guarded code path is about to not exist at all — worth revisiting whether the flag itself should be removed in the same pass, or kept as a documented banner for a future real fallback.

## `NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS`

- **Location**: `src/lib/analytics/flags.ts::getFirstInterviewQuestionCount()` — numeric override, parsed and clamped to 4–10
- **Default state**: unset → `6`
- **Purpose**: overrides the number of questions in a candidate's first interview. The file's own comment says this key was "kept for documentation" from a removed PostHog-based experiment (`first_interview_questions` — control `6` vs. variant `4`).
- **Owner**: Unknown — not verified.
- **Category**: Experiment override, currently inert as an experiment (PostHog removed; no active A/B split found in code — the override applies uniformly to whoever sets the env var, not a randomized cohort). Functions today as a permanent tuning knob, not an active experiment.
- **Planned removal criteria**: **None found; likely doesn't need one** — it's a bounded, safe numeric override rather than a behavior-branching flag. No action needed unless a real experiment framework returns.

## `RESUME_OCR_ENABLED`

- **Location**: `src/lib/pdf/ocr-fallback.ts::ocrEnabled()` — `process.env.RESUME_OCR_ENABLED !== '0'`
- **Default state**: unset → **enabled** (note the inverted polarity: this is an opt-out, not an opt-in — setting it to anything other than the literal string `'0'` leaves OCR on).
- **Purpose**: kill switch for the Tesseract.js OCR fallback path on scanned/low-text PDFs (bounded to 3 pages / 12s / 4MB / 8-per-hour per user).
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational toggle (cost/latency safety valve, not a migration flag).
- **Planned removal criteria**: N/A — designed to exist indefinitely as an ops lever.

## `RESUME_PARSE_FORCE_AI`

- **Location**: `src/lib/resume/graceful-parse.ts::shouldSkipAiForSpeed()` — `process.env.RESUME_PARSE_FORCE_AI === '1'` forces the AI parse path even for very short/low-quality extracted text (normally such text skips straight to the regex-based heuristic parser).
- **Default state**: unset → normal quality-based skip logic applies (heuristic fast-path for `minimal` band + <55 words).
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational/debug toggle.
- **Planned removal criteria**: N/A.

## `IE_UPLOAD_DIAGNOSTICS`, `IE_DEBUG_ROUTES`, `IE_UPLOAD_SKIP_DB`, `IE_UPLOAD_BYPASS_PARSE`

- **Location**: all four in `src/lib/debug/upload-diagnostics.ts`.
- **Default states**: `IE_UPLOAD_DIAGNOSTICS` → **enabled automatically when `NODE_ENV === 'development'`**, otherwise needs `=== '1'`. The other three → unset means off, need literal `'1'`.
- **Purpose**: `IE_UPLOAD_DIAGNOSTICS` — richer JSON error bodies + stack traces from the resume upload route. `IE_DEBUG_ROUTES` — unlocks `/api/debug/env`, `/api/debug/storage`, `/api/debug/storage-upload`. `IE_UPLOAD_SKIP_DB` — resume upload returns after storage write only, skipping the DB insert. `IE_UPLOAD_BYPASS_PARSE` — skips PDF/text extraction entirely for upload-path testing.
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational debug toggles — the file's own header says "Enable on Vercel only while debugging," meaning each *activation* is meant to be transient, but the toggle mechanism itself is permanent infrastructure.
- **Planned removal criteria**: N/A for the mechanism. **Operational risk to flag explicitly**: `IE_DEBUG_ROUTES=1` and `IE_UPLOAD_BYPASS_PARSE=1` left on in production would expose debug endpoints / silently skip real parsing — there is no code-level safety net beyond the operator remembering to unset them (`.env.example` says "keep 0 or unset in production" as a comment, not an enforced check).

## `CAMPUS_WORKSPACE_AUTO_APPROVE` / `CAMPUS_ORG_APPROVED_EMAILS`

- **Location**: both in `src/lib/college/org-verification.ts::shouldAutoApproveCampusOrg()`.
- **Default state**: both unset → every new campus org verification status is `'pending'` (safe default).
- **Purpose**: `CAMPUS_WORKSPACE_AUTO_APPROVE=true` auto-approves **every** new campus org signup, bypassing manual review entirely (dev / Vercel Preview / local only). `CAMPUS_ORG_APPROVED_EMAILS` is a comma-separated allowlist for approving specific pilot emails without a blanket auto-approve — **this allowlist still works in production**.
- **Owner**: Unknown — not verified.
- **Category**: Security-relevant permanent toggle with a **code-level production hard-stop**: when `VERCEL_ENV === 'production'`, `CAMPUS_WORKSPACE_AUTO_APPROVE` is ignored even if set to `true`. Preview (`VERCEL_ENV=preview`) and local (unset `VERCEL_ENV`) keep the previous auto-approve behavior for development. Do not use `NODE_ENV` for this check — it is `production` on previews and `next start`.
- **Planned removal criteria**: N/A for the mechanism.

## `BLOCK_SEARCH_INDEXING`

- **Location**: `src/lib/seo/crawl-policy.ts::isFullSiteCrawlBlocked()` — `process.env.BLOCK_SEARCH_INDEXING === 'true'`, **or automatically true whenever `VERCEL_ENV` is set and is not `'production'`** (i.e., previews are noindexed by default with no env var needed).
- **Default state**: unset in production → crawlable (correct); unset in any non-production Vercel environment → automatically blocked (safe default, no flag needed there).
- **Purpose**: manual override to noindex the entire site regardless of environment (e.g., during an incident or pre-launch freeze).
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational safety toggle.
- **Planned removal criteria**: N/A.

## `INDEXNOW_DEBUG`

- **Location**: `src/lib/seo/indexnow.ts` — `process.env.INDEXNOW_DEBUG === '1' || === 'true'`
- **Default state**: unset → off.
- **Purpose**: verbose logging for IndexNow submission calls.
- **Owner**: Unknown — not verified.
- **Category**: Permanent minor debug toggle.
- **Planned removal criteria**: N/A.

## `localStorage.VOICE_DEBUG` (client-side, not an environment variable)

- **Location**: `src/lib/voice/lifecycle-log.ts::voiceDebugEnabled()`.
- **Default state**: always-on in development/preview builds (dead-coded out of production bundles per the file's own comment on `NODE_ENV` static replacement); in production, off unless an operator runs `localStorage.setItem('VOICE_DEBUG', '1')` in their own browser session.
- **Purpose**: lets a support engineer opt into verbose `[VOICE_DEBUG]` console logging on a live production session without redeploying, to diagnose the "Listening but no transcript" failure class.
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational debug toggle, deliberately designed this way (explicit in-code rationale).
- **Planned removal criteria**: N/A.

## `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT`

- **Location**: `src/lib/interview/default-interview-start-path.ts::getInterviewEngineDefault()` / `getDefaultInterviewStartPath()` — `process.env.NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT === 'v1'` selects legacy onboarding; any other value (including unset) selects v2.1 script start (`/interview/script/start`).
- **Default state**: unset → **`v2.1`** (script engine is the primary Start Interview entry).
- **Purpose**: cutover / instant rollback for which path all primary "Start Interview" / practice-again CTAs resolve to. Does **not** delete or disable v1 — `/onboarding` and `/interview/new` stay fully reachable by direct URL either way.
- **Owner**: Unknown — not verified (solo founder de facto).
- **Category**: Permanent operational safety toggle (cutover rollback lever).
- **Planned removal criteria**: N/A while both engines coexist. Revisit only after v1 routes are intentionally retired in a separate, explicit task.
- **Rollback**: set `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT=v1` in Vercel → redeploy (or wait for next deploy). Primary CTAs return to `/onboarding`. Confirm with one dashboard "Start Interview" click.

## `VOICE_LLM_TTS_STREAMING` / `NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING`

- **Location (server)**: `src/lib/interview/script-turn-stream.ts::isLlmTtsStreamingEnabled()` / `wantsScriptTurnSse()` — also gates legacy `src/app/api/interview/process-answer/route.ts` and `src/lib/voice/conversation/http-conversation-engine.ts`.
- **Location (client)**: `src/lib/interview/script-turn-sse-client.ts::isClientLlmTtsStreamingEnabled()` — only `NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING` is inlined into the browser bundle.
- **Default state**: unset → **off** (JSON `/turn` responses; no SSE first-sentence path).
- **Purpose**: when `true`, script engine `POST /api/interview/script/turn` may emit SSE (`event: sentence` then `complete`) so TTS can start on the first natural speech sentence while the LLM finishes. Same flag also enables SSE on the legacy `/api/interview/process-answer` path. Server flag is authoritative; the client `NEXT_PUBLIC_` value only prefers `Accept: text/event-stream` when early TTS is desired — a missing/stale client value must not permanently disable server-side streaming when the operator has the server flag on.
- **Owner**: Unknown — not verified (solo founder de facto).
- **Category**: Permanent operational toggle (latency / UX lever for LLM→TTS pipeline).
- **Planned removal criteria**: N/A while SSE and JSON fallback coexist. Revisit only after JSON-only fallback is intentionally retired.
- **Rollback**: unset both vars in Vercel (or set to anything other than the literal string `true`) → redeploy. Turns fall back to non-streaming JSON.
- **See also**: [docs/VOICE.md](VOICE.md) LLM→TTS SSE note; [docs/AI_PIPELINE.md](AI_PIPELINE.md) script-engine turn path.

## `ELEVENLABS_OPTIMIZE_LATENCY`

- **Location**: `src/app/api/tts/route.ts` — appended as `?optimize_streaming_latency=` on the ElevenLabs stream URL when non-empty and not `'0'`.
- **Default state**: unset → **`'3'`** (ElevenLabs max optimize level for streaming).
- **Purpose**: tunes ElevenLabs streaming latency vs. quality. Set to `0` (or empty after an explicit override that disables the query) to omit the optimize param.
- **Owner**: Unknown — not verified.
- **Category**: Permanent operational tuning knob (TTS latency).
- **Planned removal criteria**: N/A.
- **Rollback**: set `ELEVENLABS_OPTIMIZE_LATENCY=0` (or a lower level `1`/`2`) in Vercel → redeploy if streaming audio quality regressions appear.

## `ANALYZE` (build tooling, not a product feature flag)

- **Location**: `next.config.ts` — `process.env.ANALYZE === "true"`, wired to the `npm run analyze` script.
- **Purpose**: enables `@next/bundle-analyzer` for a local build. Never read at runtime by the deployed application.
- **Category**: Build tooling. Included here only for completeness of the environment-variable inventory; excluded from the "needs exit criteria" concern since it never gates product behavior.

---

## Summary: what this registry makes visible for the first time

Of the product-behavior flags inventoried (including `VOICE_LLM_TTS_STREAMING` / `NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING` and `ELEVENLABS_OPTIMIZE_LATENCY` added for the script-engine SSE/TTS release), **exactly one has any written exit intent** (`NEXT_PUBLIC_AUTH_V2`, and even that isn't measurable). `CAMPUS_WORKSPACE_AUTO_APPROVE` now has a Vercel-production hard-stop in `org-verification.ts` (see that flag's section above).
