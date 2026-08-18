# Architecture — InterviewEra

Deep-dive reference for application architecture, request lifecycle, auth/authorization, database, API, deployment, and cross-cutting engineering strategy. Read [CLAUDE.md](../CLAUDE.md) first for critical invariants and working rules — this doc is the "why/how" behind them.

---

## Application architecture

Next.js App Router monolith. Route groups separate concerns without affecting URLs:

```
src/app/
  (auth)/         # login, signup, forgot/reset-password, college/signup — public auth pages
  (dashboard)/    # authenticated app shell: dashboard, interview, history, report, resume,
                  # roadmap, readiness, settings, profile, notifications, analytics, upgrade, feedback
  (marketing)/    # public marketing site: about, blog, campus, community, help, how-it-works,
                  # interview-questions (programmatic SEO), interviewera, join, pricing, privacy,
                  # refund, resources, teams, terms, tools
  admin/          # bulk-invite, admin dashboard (platform_role='admin' or ADMIN_EMAILS gate)
  college/        # campus admin dashboard + join flow (separate from (auth)/(dashboard) groups)
  platform/       # platform-admin analytics/feedback/growth views
  auth/           # OAuth callback, email confirm, error recovery, verify-pending
  api/            # ~30 route groups — interview, resume, payments, cron, analytics, feedback, etc.
```

Client/server split: Server Components by default; `"use client"` used for interview session state, voice hooks, forms, and animation. Data mutations go through Route Handlers (`src/app/api/**`) or Server Actions (`src/app/actions/`), not client-side direct DB calls (RLS + service-role split enforces this).

## Request lifecycle (`middleware.ts`)

Every request (except static assets, matched via the `config.matcher` regex) flows through [../middleware.ts](../middleware.ts):

1. **Host/protocol normalization** — `www.interviewera.com` → `interviewera.com` (301), then HTTP → HTTPS on the apex.
2. **Bot/crawler bypass** — Vercel/Lighthouse/crawler/`*bot` user agents skip session + auth work entirely.
3. **Auth V2 redirects** — `/college/signup` → `/signup?intent=college`, legacy `?error=` on `/login` normalized to `/auth/error?code=...` when `isAuthV2Enabled()`.
4. **Static asset bypass** — `_next/static`, `_next/data`, and image/font extensions skip session refresh.
5. **Stray OAuth `?code=` forwarding** — non-callback routes with a `code` param redirect to `/auth/callback`.
6. **Rate limiting** (Redis/Upstash, per path prefix, before any DB/auth work) — e.g. `/api/interview/answer` 60/60s, `/api/resume/upload` 5/60s, `/api/payments` 10/60s.
7. **Session resolution** (`updateSession()`) only for routes that need it (protected pages, auth routes, or resume/JD upload APIs that need a fresh cookie for multipart POSTs).
8. **Auth gate** — unauthenticated + protected route → redirect to `/login?next=...`; authenticated + auth route → redirect to post-auth destination.

## Authentication flow

- **Clients**: `src/lib/supabase/client.ts` (browser, anon key), `src/lib/supabase/server.ts` (`createClient()` — cookie-backed RSC-safe client; `createServiceClient()` — raw service-role client that validates the key looks like a real service key and bypasses RLS).
- **Methods**: email/password and Google OAuth (`src/app/auth/callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)`).
- **Auth V2 migration in progress**: `src/lib/auth/flags.ts::isAuthV2Enabled()` gated by `NEXT_PUBLIC_AUTH_V2`. When on, redirect-destination resolution, error-code normalization, and invite-token handling route through a newer, more structured set of modules (`resolve-destination.ts`, `auth-errors.ts`, `auth-intent.ts`); legacy inline logic remains for when the flag is off. **Do not remove the legacy path until V2 is fully rolled out and confirmed.**
- **Session refresh** (`src/lib/supabase/middleware.ts::updateSession`): calls `supabase.auth.getUser()` (network-verified, not just cookie-decoded), writes refreshed cookies to both the forwarded request and the response. On stale-refresh-token errors, strips all `sb-*` cookies and marks the request with `x-ie-sb-cookies-stripped: 1` so Server Components downstream know to ignore stale cookies.
- No local JWT-secret verification — auth state is always confirmed via a live Supabase call, never decoded client-side trust.

## Authorization flow — three-tier multi-tenancy

1. **Individual users** — `users.plan_tier` (`free|starter|pro|campus`).
2. **Campus/college organizations** — `campus_organizations` table; `src/lib/college/rbac.ts` defines `CampusRole` (`campus_admin | placement_officer | recruiter`) with permission sets. Enforcement is in **API-route guard functions**, not campus-scoped RLS: `src/lib/college/api-auth.ts::requireCampusAuth()` verifies the session, looks up `plan_tier`, checks the permission, and confirms org ownership (`admin_user_id = user.id`) before returning 401/403/404 directly.
3. **Platform admins** — `users.platform_role = 'admin'` (migration `025_platform_role.sql`) OR email match in the `ADMIN_EMAILS` env var. Checked in `src/app/platform/layout.tsx` and reused via `src/lib/admin/auth.ts::isPlatformAdminUser`.

## Database architecture & data model

Supabase Postgres, RLS enabled on every table, 90+ sequential migrations in [../supabase/migrations/](../supabase/migrations) (run in numeric order per [../README.md](../README.md); filenames are serial `NNN_name.sql` only — never 14-digit timestamps). Core tables from `001_initial_schema.sql`: `users`, `resumes`, `interviews`, `questions`, `answers`, `evaluations`, `reports`, `subscriptions`, `referrals`, `credit_transactions`. Later additions layer on: campus/candidate workspace fields (005, 019, 048, 049), storage buckets (013/014), dual-agent conversation state (020/021/022 — see [AI_PIPELINE.md](AI_PIPELINE.md)), AI telemetry (023, 033), platform roles (025), feedback pipeline (026–032), one-time plan payments (035/036), lifecycle email automation (037/046/047), platform security hardening (050), and post-launch growth/analytics (051).

**Deprecated / unreferenced tables (verified 2026-07-05 — zero code references anywhere in `src/`, re-checked at time of writing)**: `subscriptions` (`001_initial_schema.sql` — legacy of the pre-one-time-payments billing model; superseded by the one-time plan payments in 035/036; do not assume this is the active billing table), `realtime_session_metrics` (`023_ai_telemetry.sql` — schema exists, never had a writer), `roadmap_tasks` and `user_roadmaps` (`049_candidate_workspace.sql`), `cohort_leaderboard`, `college_admin_actions`, and `student_deadline_progress` (`supabase/manual/supabase-migration-retention-system.sql` — historical non-numbered retention-system draft; not in the migration chain). These are comment-only findings, not scheduled for deletion — DROPs require row-count checks against production plus explicit founder sign-off per this repo's destructive-migration rule; see `TECH_DEBT.md` H4.

Ownership-scoped RLS: `users`/`resumes`/`interviews` filter on `auth.uid()` directly; `questions`/`answers`/`evaluations`/`reports` use nested `EXISTS` joins up through `interviews.user_id`. Grants: `service_role` gets ALL; `authenticated` gets scoped SELECT/INSERT/UPDATE/DELETE; `anon` has blanket SELECT on public tables (from migration 001 — a broad grant that migration 050 does not revisit).

**Credit RPCs** (`002_rpc_functions.sql`, migration `085_phase6a_credit_interview_ownership.sql`, all `SECURITY DEFINER`): new interview starts use service-role-only `create_interview_with_credit`, which creates the interview, decrements `users.credits_remaining`, marks `interviews.credit_deducted`, and inserts a `credit_transactions` debit linked by `interview_id` in one transaction. The debit-only `deduct_credit` / `deduct_interview_credit` functions are retained for migration compatibility but are non-executable. `refund_credit(user_id, interview_id)` is the linked, idempotent start-failure refund; `add_credit` remains the generic service-role-only grant primitive.

**Manual technical-failure restoration** (migration `086_phase6b_technical_failure_cases.sql`): `technical_failure_cases` extends an authenticated `feedbacks` submission with one durable case per owned interview. Service-role-only review RPCs lock the case, verify the exact Phase 6A debit, append one `technical_failure_restore` ledger credit, and mark the interview debit restored in the same transaction. Repeated/racing decisions are no-ops after the first terminal decision. A separate late-resolution RPC can append at most one `service_recovery_credit` after 72 hours; neither path changes plan, expiry, payment, or subscription state.

**DB convention lesson**: RLS policies alone are not sufficient. Migration `033_ai_telemetry_grants.sql` exists purely because migration `023` defined RLS policies without matching table-level GRANTs, causing silent `permission denied (42501)` failures. Always add both.

## API architecture

Route Handlers under `src/app/api/`, grouped by domain: `account`, `activity`, `admin`, `analytics`, `auth`, `college`, `cron`, `debug`, `email`, `feedback`, `health`, `indexnow`, `interview`, `job-description`, `og`, `onboarding`, `payments`, `product-events`, `referral`, `report`, `resume`, `share`, `stats`, `stt`, `tts`. Cron routes verify `Authorization: Bearer $CRON_SECRET`. Long-running routes (resume upload/parse, JD extract, interview start) get `maxDuration: 60` overrides in [../vercel.json](../vercel.json).

## Deployment pipeline

Vercel-native — no Dockerfile. [../vercel.json](../vercel.json) defines 5 crons (`health-snapshot`, `daily-rollup`, `plan-expiry`, `weekly-digest`, `feedback-retry`), `maxDuration: 60` overrides for upload/parse/extract/start routes, and www/http→https redirects (mirrored again in `middleware.ts` and `next.config.ts` as defense-in-depth — see [Hidden dependencies](#hidden-dependencies--non-obvious-coupling) below). Build script: `next build --webpack && tsx scripts/noindex-audit.ts` — the build **fails** if the noindex audit fails. CI (`.github/workflows/ci.yml`) runs on every push: `quality` (lint → typecheck → unit tests) → `e2e_auth` + `pdf_extract` (parallel) → `build` → `audit` (npm audit, critical only). A second workflow, `e2e-integration.yml`, is manual-dispatch-only and runs against real Supabase secrets for cross-device resume testing pre-release.

## Error handling strategy

Consistent pattern across the codebase: **degrade, don't fail**. Resume extraction accepts weak text rather than rejecting uploads; evaluation always inserts a fallback all-5 score rather than leaving a null; dual-agent conversation-state failures are non-fatal; rate limiting fails open on non-critical routes (login, signup) but fails closed on financially/resource-sensitive routes (interview, resume upload, STT, payments — 503 + `Retry-After`); voice-quota enforcement fails open ("don't block interviews") on Redis errors. Typed error classes exist for specific domains (`PDFEncryptedError`, `PDFScannedNoTextError`, `QuotaExhaustedError`, `FallbackDisabledError`).

## Logging strategy

Structured, prefix-tagged console logging, consolidated over time: `src/lib/voice/lifecycle-log.ts` is the shared logger for the voice subsystem; `src/lib/telemetry/interview-telemetry.ts` explicitly replaced older fragmented prefixes (`[INTERVIEW]`, `[VOICE]`, `[interview-startup]`, `[mic-flow]`, `[session:lifecycle]`) with one system. Payment logs use `[payment:*]` prefixes (`src/lib/razorpay/payment-log.ts`) — grep-able in Vercel logs.

## Testing strategy

- **Unit** (Vitest, `node` environment): `src/**/*.test.ts`, coverage via `@vitest/coverage-v8` (text, text-summary, html, lcov). Per `docs/FINAL_PRODUCTION_CERTIFICATION.md`: 374/374 passing at v1.0.0 launch, ~60% statement coverage, weakest modules are email providers and `lib/supabase/server.ts` (0%).
- **E2E** (Playwright, single Chromium project, `workers: 1`, `fullyParallel: false`): `e2e/` grouped by domain (auth, candidate, college, interview, marketing). One spec is tagged `@integration` (`interview/resume.integration.spec.ts`) and excluded from the default `test:e2e` run; `test:e2e:integration` runs only that tag against real Supabase (manual CI workflow, not on every push).
- **Voice pipeline** has its own out-of-band verification — see [VOICE.md](VOICE.md).

## Caching strategy

Upstash Redis (`src/lib/redis/`) backs rate limiting (`rate-limit.ts`, sliding-window-by-slot) and voice-quota session accounting. Fail-open vs fail-closed is chosen per-route by risk (see Error handling above). No general-purpose data cache layer was found beyond Next.js's own fetch/ISR caching and `minimumCacheTTL: 86400` for images.

## Performance strategy

`next.config.ts`: `optimizePackageImports` for `lucide-react`/`recharts`, AVIF/WebP image formats, `serverExternalPackages` + `outputFileTracingIncludes` to correctly bundle `pdfjs-dist`/`@napi-rs/canvas` font/cmap assets into serverless functions (a recurring source of prod-only bugs if misconfigured — see [High risk: PDF bundling](#high-risk-pdf-bundling--serverless-tracing) below). Bundle analysis available via `npm run analyze` (`@next/bundle-analyzer`).

---

## High risk: Auth V2 migration

**Why high risk**: two auth logic paths currently coexist behind `NEXT_PUBLIC_AUTH_V2`; a partial migration or flag-flip mistake could silently break login/signup redirects for a subset of users.
**Files**: `src/lib/auth/*`, `middleware.ts`, `src/app/auth/callback/route.ts`, `src/app/(auth)/*`.
**Common mistakes**: modifying only the V2 path and assuming the legacy path is dead code; not testing both flag states.
**Verification required**: exercise both `NEXT_PUBLIC_AUTH_V2` on and off; check `e2e/auth/*.spec.ts` (login, error, open-redirect, a11y) pass in both states.

## High risk: Database / RLS

**Why high risk**: migration 050 exists because a prior grant scheme let any authenticated client mutate privileged columns and call credit RPCs directly — a real gap that was closed, not a theoretical one.
**Files**: `supabase/migrations/001_initial_schema.sql`, `050_production_security_hardening.sql`, `002_rpc_functions.sql`.
**Common mistakes**: adding a new privileged column to `users` without adding it to the `guard_users_privileged_update()` blocklist; granting `authenticated` broad UPDATE on a table that should be service-role-only.
**Verification required**: any new migration touching `users`, `credit_transactions`, or the credit RPCs should be reviewed against [CLAUDE.md's Critical Invariants](../CLAUDE.md#critical-invariants) before applying.

## High risk: PDF bundling / serverless tracing

**Why high risk**: `pdfjs-dist`/`@napi-rs/canvas` font/cmap assets have broken in Vercel serverless bundling before — see [AI_PIPELINE.md](AI_PIPELINE.md) for the resume-parsing risk detail this protects.
**Files**: `next.config.ts` (`pdfTraceGlobs`, `outputFileTracingIncludes`, `serverExternalPackages`).
**Common mistakes**: adding a new route that touches `pdfjs-dist` without adding it to `outputFileTracingIncludes`.

---

## Repository map

**Important directories**: `src/lib/` (business logic, organized by domain — 30+ subdirectories), `src/app/api/` (~30 route groups), `src/hooks/` (~35 hooks, mostly interview/voice session state), `src/lib/seo/programmatic/` (~29 files — see [SEO.md](SEO.md)), `supabase/migrations/` (51+ sequential SQL files, the authoritative schema history).

**Important services / shared abstractions**: `src/lib/supabase/{client,server,middleware}.ts` (the only sanctioned way to talk to Supabase), `src/lib/redis/rate-limit.ts` (shared rate limiter used by middleware and individual routes), `src/lib/ai/chat-completion-core.ts` (shared retry/timeout wrapper all LLM calls should go through — see [AI_PIPELINE.md](AI_PIPELINE.md)), `src/lib/telemetry/interview-telemetry.ts` (shared telemetry emitter), `src/lib/razorpay/activate-plan.ts` (single source of truth for plan activation — see [PAYMENTS.md](PAYMENTS.md)).

**Reusable components**: `src/components/ui/` (shadcn-derived primitives), `src/components/seo/` (`StructuredData.tsx`, `JsonLdScript.tsx` — reusable JSON-LD injection), `Reveal`-style animation wrappers referenced in the (partially stale) frontend quality skill doc — confirm current existence before reusing.

## Hidden dependencies / non-obvious coupling

- `middleware.ts`, `vercel.json`, and `next.config.ts` all independently implement www→apex/HTTP→HTTPS redirects — this is deliberate defense-in-depth (per `docs/SEO-INFRASTRUCTURE.md`), not accidental duplication. Changing one without checking the others can create redirect loops or gaps.
- `next.config.ts`'s CSP `headers()` is the **single source of truth** for security headers — middleware does not duplicate them (explicit comment in the file).
- Migration `033_ai_telemetry_grants.sql` — see DB convention lesson above.

## Known stale documentation

- `docs/archive/SKILL_FRONTEND_QUALITY.md`, `docs/archive/SKILL_SEO_TECHNICAL.md`, `docs/archive/CLAUDE_CODE_PREMIUM_UPGRADE.md` (moved from `Skills/`, 2026-07) reference **PostHog** and **Zustand** — neither appears in `package.json` dependencies. These read as an early/aspirational draft (also cite "Next.js 14", "React 18") and do not reflect the current stack. Verified analytics is GA4 + Clarity + Vercel Analytics + internal `product_events`; verified state is Server Components + hooks, not Zustand. Archived, not live documentation — do not use as context.

## Technical debt / known limitations

(from `docs/FINAL_PRODUCTION_CERTIFICATION.md` §11)
- `user_activity` heartbeat table has an RLS permission issue logged as non-blocking best-effort.
- Coverage on email providers and `lib/supabase/server.ts` is 0% — integration-heavy, not covered by unit tests.
