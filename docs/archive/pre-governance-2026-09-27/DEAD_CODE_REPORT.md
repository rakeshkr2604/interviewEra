# Dead Code Report — InterviewEra

Generated 2026-07-05 from repository scans (grep reference-checks, madge over 1,079 files, package/env/table cross-references). **No code was changed.**

**Method + honesty caveats**: "Dead" below means *zero references found by file/identifier grep across `src/`, `scripts/`, configs, and CI*. This detects dead **files, hooks, components, tables, deps, env vars** reliably, but NOT dead *exports inside live files* (needs `knip`/`ts-prune` — **Unknown — not verified**). Components loaded via computed dynamic-import strings would be false-positived as dead — none were found, but treat every deletion as: delete → `npm run build` + `npm test` → revert if anything breaks.

---

## 1. Confirmed dead files (zero references anywhere)

| Item | Evidence | Safe to delete? |
|---|---|---|
| `src/lib/mistral/` (entire directory) | Zero imports of `@/lib/mistral` or `mistral/client` anywhere; the platform-wide disable (`src/lib/ai/single-provider-mode.ts`) never touches it — 'mistral' elsewhere is only a provider-key *string* in `lib/ai/*` | Yes — but note CLAUDE.md invariant #9 documents it as a "disabled fallback"; update CLAUDE.md + docs/AI_PIPELINE.md in the same commit |
| `src/hooks/useInterviewStartup.ts` | Zero importers (checked alias + relative + bare-name) | Yes |
| `src/hooks/useTheme.ts` | Zero importers — **duplicate**: live `useTheme` is exported from `@/lib/theme/ThemeProvider` (used by question-generator, star-builder) | Yes |
| `src/lib/api/pagination.ts` | Zero importers; `src/lib/api/` contains only this file | Yes (removes the whole directory) |
| `src/components/debug/SttInputDebugPanel.tsx` | Zero importers. NB: `src/lib/voice/stt-input-debug.ts` is NOT dead (used by `useSpeechRecognition.ts`) | Yes |

## 2. Zero-referenced components (20 of 285 `.tsx` files)

Verified by word-boundary basename grep across all of `src/`, excluding self:

`auth/RoleCard` · `dashboard/ActionCards` · `dashboard/ProgressStatsGrid` · `debug/SttInputDebugPanel` (above) · `interview/AnswerInput` · `interview/VoiceInterviewSession` · `landing/HeroScorecardCountUp` · `landing/LandingHeroMicroFlow` · `landing/LandingHeroProductSim` · `landing/LandingProductPreview` · `landing/LandingResumeWow` · `landing/ScoringBarsIsland` · `layout/PlacementDateModal` · `onboarding/BriefingSessionViz` · `onboarding/OnboardingStepIllustration` · `platform/RetryFeedbackButton` · `report/SpeechPatternCard` · `seo/BlogRelatedToolsStrip` · `shared/LoadingSkeleton` · `shared/PageTransition`

Pattern reading: the six `landing/*` files are almost certainly **A/B-experiment leftovers** (multiple hero variants); `interview/VoiceInterviewSession.tsx` looks like a **legacy session view** superseded by the current session page. Delete in one batch PR with build+e2e verification; landing files first (lowest risk).

## 3. Database tables with zero source references (7 of 47)

`grep` of table name across `src/` found nothing for: `subscriptions` · `realtime_session_metrics` · `cohort_leaderboard` · `college_admin_actions` · `roadmap_tasks` · `student_deadline_progress` · `user_roadmaps`

- `subscriptions` is from `001_initial_schema.sql` — legacy of the pre-one-time-payments model (035/036 moved to one-time). Contains real historical data? **Unknown — not verified** (needs a prod row count before any decision).
- `realtime_session_metrics` (migration 023) — confirmed no writer (also flagged in docs/OBSERVABILITY.md).
- The campus/roadmap tables read as **built-ahead features** never wired to code.
- **Caveat**: access via RPC or dynamic table names would evade this grep — none found, but do not DROP anything; recommended action is a `-- DEPRECATED, no code references as of 2026-07-05` comment block in a doc/migration note only. Dropping tables is a destructive migration requiring explicit sign-off per house rules.

## 4. Scripts (21 of 32 in `scripts/` referenced nowhere)

Not referenced by `package.json` scripts, `.github/`, `docs/`, `CLAUDE.md`, or other scripts:

`deployment-audit.ts` · `email-runtime-validation.ts` · `full-seo-audit.ts` · `gsc-audit-mapper.ts` · `gsc-authoritative-audit.ts` · `launch-verification.ts` · `manual-test-orchestrator.ts` · `validate-agentic-links.ts` · `validate-seo-metadata.ts` · `generate-react-hub-images.mjs` · `interview-smoke-check.mjs` · `onboarding-persist-check.mjs` · `pre-release-smoke-audit.mjs` · `release-seo-check.mjs` · `release-web-vitals.mjs` · `session-load-audit.mjs` · `session-load-login-verify.mjs` · `timer-gate-check.mjs` · `voice-app-verify.mjs` · `voice-interview-verify.mjs` · `generate-pwa-icons.cjs`

These are **launch-era one-off verification tools**, not dead code in the classic sense — but they are undocumented and rotting (they import app code that keeps changing). Recommendation: move keepers into a `scripts/manual/` folder with a README line each; delete the ones tied to completed launches. Only the founder can classify keep-vs-delete — do not bulk-delete.

## 5. Environment variables

- **All 31 vars in `.env.example` are referenced in code.** Good.
- **~45 vars are used in code but missing from `.env.example`** — including secrets that must be documented (`SESSION_SIGNING_SECRET`, `EMAIL_SIGNING_SECRET`, `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID`, `POSTMARK_SERVER_TOKEN`, `SMTP_HOST/PORT`), feature flags (`NEXT_PUBLIC_AUTH_V2`, `SINGLE_PROVIDER_MODE`, `RESUME_OCR_ENABLED`, `RESUME_PARSE_FORCE_AI`, `BLOCK_SEARCH_INDEXING`, `CAMPUS_WORKSPACE_AUTO_APPROVE`, `IE_UPLOAD_*`, `IE_DEBUG_ROUTES`), model overrides (`OPENROUTER_{CHEAP,SMART,ATS,STAR,QUESTIONS,QUESTION_GEN}_MODEL`, `OPENAI_ATS_MODEL`, `RESUME_PARSE_MODEL`), and platform vars (`VERCEL_*` — fine to omit). Full list in scan output; the fix is a documentation-only `.env.example` update.
- **Near-duplicate pairs, both live**: `ELEVENLABS_VOICE_FEMALE_ID` / `ELEVENLABS_VOICE_ID_FEMALE` is a **deliberate, unit-tested alias** (`elevenlabs-voices.ts:58-59`) — keep, document. `OPENROUTER_QUESTIONS_MODEL` (marketing question-generator tool) vs `OPENROUTER_QUESTION_GEN_MODEL` (interview question gen) are **two different features with confusable names** — document, don't rename.

## 6. Feature flags (verified inventory)

| Flag | Where | State |
|---|---|---|
| `NEXT_PUBLIC_AUTH_V2` | `src/lib/auth/flags.ts::isAuthV2Enabled` | **Live migration flag** — legacy path is intentional, not dead (do not remove until rollout confirmed) |
| `SINGLE_PROVIDER_MODE` | `src/lib/ai/single-provider-mode.ts` | Live kill switch for AI fallback (currently effectively always-on per docs) |
| `NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS` | `src/lib/analytics/flags.ts` (`FLAGS`/`FLAG_DEFAULTS`) | Live experiment flag system (env-var based) |
| `RESUME_OCR_ENABLED`, `RESUME_PARSE_FORCE_AI` | resume pipeline | Live ops toggles |
| `IE_UPLOAD_BYPASS_PARSE`, `IE_UPLOAD_SKIP_DB`, `IE_UPLOAD_DIAGNOSTICS`, `IE_DEBUG_ROUTES` | `src/lib/debug/upload-diagnostics.ts` | Debug toggles — production-reachable; document them |
| `localStorage.VOICE_DEBUG` | `lifecycle-log.ts` | Client-side prod debug opt-in (by design) |
| `BLOCK_SEARCH_INDEXING`, `CAMPUS_WORKSPACE_AUTO_APPROVE`, `CAMPUS_ORG_APPROVED_EMAILS` | SEO / campus | Live ops toggles |

No orphaned flags found (every flag var has live call sites). The gap is documentation, not deadness.

## 7. Dependencies

- **`@react-email/ui`** (devDep) — zero direct imports. Likely consumed implicitly by the `react-email` preview CLI (`npm run email`). **Unknown — not verified**: remove only after confirming `npm run email` still works without it.
- All other 53 deps have ≥1 verified reference (spot-checked down to 1-reference deps: all legitimate — e.g. `@deepgram/sdk` in `stt-client.ts`, `png-to-ico` in the favicon script).
- **`packages/node-domexception`** — a vendored one-file package, wired via `package.json` `overrides` (`"node-domexception": "2.0.2"`). Purpose undocumented in-repo (presumably silencing a deprecated transitive dep of the PDF/fetch chain). Not dead — but needs a README line; it looks like cruft to anyone who doesn't know.

## 8. Experimental / parallel implementations (NOT dead — needs a decision)

- **Voice v2 stack** — `src/lib/voice/{core,orchestrator,conversation,tts,audio}/` + `src/components/interview/VoiceSessionView.tsx` + `src/hooks/useVoiceSession.ts` + **live page route `src/app/(dashboard)/interview/session/[id]/v2/page.tsx`**. The page header says it verbatim: "PARALLEL smoke-test route for the rebuilt voice pipeline… Once verified in-browser, the legacy route is cut over to this view and the old hooks/page are deleted." It is auth-gated but **reachable in production by any logged-in user who guesses the URL**, and it is not linked from anywhere (verified: zero links to `/v2`). This is the single largest source of "which code is real?" confusion in the repo (~30+ files). A cutover-or-delete decision is the highest-leverage confidence action available.
- **Legacy auth path** behind `NEXT_PUBLIC_AUTH_V2` — intentional dual-path migration; keep, but it belongs on the debt register with an expiry condition.
- **Legacy voice log prefixes** (`[VOICE]`, `[INTERVIEW]`, `[mic-flow]`, `[interview-startup]` in `lifecycle-log.ts`) — superseded by `interviewTelemetry` per that file's own comments, still emitted. Cleanup candidates once the observability program lands.

## 9. Stale / misleading artifacts

- **8 docs deleted in the working tree but still referenced**: `PAYMENT_ARCHITECTURE.md` (called *authoritative* by CLAUDE.md + docs/PAYMENTS.md), `PRE_DEPLOY_SEO_CHECKLIST.md`, `docs/FINAL_PRODUCTION_CERTIFICATION.md`, `docs/SEO-INFRASTRUCTURE.md` + 4 others. References exist in `CLAUDE.md` (2), `docs/ARCHITECTURE.md` (3), `docs/PAYMENTS.md` (2), `docs/SEO.md` (3), `docs/OBSERVABILITY.md` (1). **Either restore (`git checkout -- <file>`) or migrate their content and fix every reference — before the deletion is committed.** This is the report's most urgent item.
- `Skills/` (3 files) — self-identified stale (PostHog/Zustand/Next 14 — none in the stack); referenced only by CLAUDE.md *as a warning*. Move to `docs/archive/` or delete + update CLAUDE.md.
- `README.md` — says Next.js 15 + Mistral fallback; both wrong (Next 16.2.7, fallback disabled and directory dead).
- `logs/` — committed launch-era output artifacts (`product-update-*.log`, preview HTML). Should be gitignored + removed from tracking.
- `.voice-verify-out/` — untracked screenshot artifacts, **not in `.gitignore`** — add it.
- `test-results/` is gitignored but a directory exists locally — fine.

## 10. Duplicate implementations

| Duplicate | Verdict |
|---|---|
| `src/hooks/useTheme.ts` vs `src/lib/theme/ThemeProvider` | Hook is dead — delete (item 1) |
| Three AI telemetry emit paths (`observability/ai-telemetry.ts`, `telemetry/structured-ai-log.ts`, `telemetry/ai-logger.ts`) | All live, overlapping vocabularies — consolidation already planned as RFC-012 in docs/OBSERVABILITY_RFCS.md |
| `src/lib/openai/` naming | Contains OpenRouter-routed code (its own header admits it); `src/lib/openrouter/client.ts` also exists. Not dup logic, but a misleading name — document, don't rename (import-surface churn > benefit) |
| www→apex redirect ×3 (`vercel.json`/`middleware.ts`/`next.config.ts`) | **Deliberate defense-in-depth** (CLAUDE.md invariant #7) — not duplication, do not touch |
| `src/services/api.ts` (lone file) vs `src/lib/client/` fetch helpers | Both live; `services/` exists for one file — fold into `lib/` someday (Low) |

---

**Not covered (be explicit):** unused *exports* inside live files, unused type declarations, unused Tailwind classes, orphaned public/ assets — all **Unknown — not verified**; a `knip` run would close the gap and is recommended as a cleanup-roadmap task.
