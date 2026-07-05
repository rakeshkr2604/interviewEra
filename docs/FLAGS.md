# Feature Flags Registry — InterviewEra

Every environment-variable-gated or runtime-toggle behavior in the codebase, verified by reading each implementing file directly (2026-07-05). This is the registry required by [MASTER_ENGINEERING_ROADMAP.md](../MASTER_ENGINEERING_ROADMAP.md)'s standing rule #4: **a new flag without an exit-criteria entry here is a review rejection.** For the existing flags below, most predate this rule — their missing exit criteria are stated honestly, not retrofitted.

Two categories exist and are labeled per flag: **Migration/Experiment** (should eventually be removed once its condition is met) and **Permanent operational toggle** (a standing safety valve or debug switch, not expected to be removed — "exit criteria" doesn't apply the same way).

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
- **Purpose**: `CAMPUS_WORKSPACE_AUTO_APPROVE=true` auto-approves **every** new campus org signup, bypassing manual review entirely. `CAMPUS_ORG_APPROVED_EMAILS` is a comma-separated allowlist for approving specific pilot emails without a blanket auto-approve.
- **Owner**: Unknown — not verified.
- **Category**: `CAMPUS_WORKSPACE_AUTO_APPROVE` is a **security-relevant permanent toggle** — `.env.example` explicitly warns "keep UNSET in production," meaning this is a dev/staging convenience with no code-level production guard (no `NODE_ENV`/`VERCEL_ENV` check inside the function itself — verified by reading the file above). If ever set to `true` in a production environment variable by mistake, campus admin self-service escalation (the exact class of privilege escalation this module's own header warns against — "prevents self-service campus_admin escalation") becomes possible with zero additional gate. `CAMPUS_ORG_APPROVED_EMAILS` is an ongoing allowlist, not a flag needing removal.
- **Planned removal criteria**: N/A for the mechanism, but flagging as a real risk: **this flag has no production safety net beyond operator discipline** — worth a follow-up (out of scope for this task) to add a `NODE_ENV`/`VERCEL_ENV==='production'` guard directly in the function.

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

## `ANALYZE` (build tooling, not a product feature flag)

- **Location**: `next.config.ts` — `process.env.ANALYZE === "true"`, wired to the `npm run analyze` script.
- **Purpose**: enables `@next/bundle-analyzer` for a local build. Never read at runtime by the deployed application.
- **Category**: Build tooling. Included here only for completeness of the environment-variable inventory; excluded from the "needs exit criteria" concern since it never gates product behavior.

---

## Summary: what this registry makes visible for the first time

Of 13 product-behavior flags inventoried, **exactly one has any written exit intent** (`NEXT_PUBLIC_AUTH_V2`, and even that isn't measurable), and **one has a real, currently-unmitigated production risk** if misconfigured (`CAMPUS_WORKSPACE_AUTO_APPROVE`, which has no code-level production guard). Neither of these is fixed by this document — this document's job is only to make both facts impossible to miss going forward. Fixing them is out of scope for this task (no runtime changes) and belongs to a future task once the founder decides how to act on this evidence.
