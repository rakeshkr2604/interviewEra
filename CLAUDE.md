# CLAUDE.md — InterviewEra Operating Manual

InterviewEra is an AI-powered mock interview practice SaaS for Indian students (individual users, college/campus placement cells, platform admins), live at `interviewera.com`. This file is the operating manual: invariants, standards, and commands needed on nearly every session. Subsystem detail lives in `docs/`:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — app structure, request lifecycle, auth/authz, database, API, deployment, error/logging/testing/caching/perf strategy
- [docs/AI_PIPELINE.md](docs/AI_PIPELINE.md) — LLM routing, resume parsing, dual-agent interview lifecycle, evaluation, report generation
- [docs/VOICE.md](docs/VOICE.md) — speech pipeline (STT/TTS), mic capture coordinator, telemetry
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — Razorpay dual-path activation (full detail also in [PAYMENT_ARCHITECTURE.md](PAYMENT_ARCHITECTURE.md))
- [docs/SEO.md](docs/SEO.md) — sitemap/robots/programmatic SEO, analytics/telemetry

Where something can't be verified from the repository, say "Unknown — not found in repository" rather than guessing.

---

## Tech stack

Next.js `^16.2.7` (App Router) · TypeScript `^6` strict · React `^19.2` · Tailwind v4 · Supabase Postgres+RLS · Supabase Auth (email + Google OAuth) · OpenRouter-routed LLMs (no Mistral fallback — removed as dead code, see Invariant #9) · Deepgram STT + Web Speech + ElevenLabs TTS · Razorpay · Resend · Upstash Redis · GA4 + Clarity + Vercel Analytics · Vercel hosting (no Dockerfile).

**Known-stale docs, archived not deleted**: `docs/archive/*.md` (formerly `Skills/`) reference PostHog and Zustand, present in neither `package.json` — early/aspirational drafts (also cite Next 14 / React 18), not current-state documentation. Do not use them as context.

---

## Critical Invariants

1. Plan-activation idempotency marker is **`users.last_payment_id === paymentId`** — never `payments.status` (caused a real production incident). → [docs/PAYMENTS.md](docs/PAYMENTS.md)
2. Credit RPCs (`deduct_credit`/`add_credit`/`refund_credit`) and `credit_transactions` inserts must stay **service-role-only**.
3. `users` UPDATE must stay restricted to the safe-column allowlist enforced by `guard_users_privileged_update()` — never widen it for non-service-role callers.
4. Evaluation/report/interview-completion paths must **never return a null/missing score** — always a neutral fallback. → [docs/AI_PIPELINE.md](docs/AI_PIPELINE.md)
5. Never allow simultaneous `getUserMedia` + Web Speech recognition — all mic access goes through `micCaptureCoordinator`. → [docs/VOICE.md](docs/VOICE.md)
6. `npm run build` must never succeed with a noindex/sitemap contradiction — don't bypass `scripts/noindex-audit.ts`. → [docs/SEO.md](docs/SEO.md)
7. Canonical host (`interviewera.com`, no `www`) normalization is intentionally triple-redundant (`vercel.json`, `middleware.ts`, `next.config.ts`) — don't remove one without checking the others.
8. `next.config.ts` `headers()` CSP is the single source of truth for security headers — update it when adding any new external script/embed/analytics provider.
9. Mistral is not a fallback — `src/lib/mistral/` was deleted 2026-07-05 (zero importers outside itself, verified; nothing in the completion chain ever called it). `MISTRAL_API_KEY` may still appear in env files, read only by a startup-check warning — that is not a live code path. Don't assume automatic failover exists to restore.
10. Do not bypass `guard_users_privileged_update`, campus org `verification_status` gating, or the `ADMIN_EMAILS`/`platform_role` admin check — there is no secondary defense layer.

---

## Engineering Standards

- **TypeScript**: `strict: true`. Path alias `@/*` → `src/*`. Zod is the validation library — use it at API boundaries and for anything AI-extracted.
- **Components**: Server Components by default; `"use client"` only for state/effects/browser APIs/Framer Motion.
- **Naming**: components `PascalCase.tsx`, hooks `useCamelCase.ts`, libs `camelCase.ts`/`kebab-case.ts`.
- **Folders**: `src/lib/<domain>/` groups by business domain, not technical layer. Tests sit next to the file they cover (`*.test.ts`).
- **Error handling**: typed error classes for known failure domains (`PDFEncryptedError`, `QuotaExhaustedError`, `FallbackDisabledError`); graceful degradation with a logged fallback on user-facing critical paths, not a thrown exception.
- **Logging**: structured, prefixed (`[payment:*]`, `[VOICE_PIPELINE]`, `[client-telemetry]`) — extend `interview-telemetry.ts` rather than inventing a new prefix.
- **Database**: every table gets RLS on creation; service-role bypass is explicit and narrow, never a blanket grant. Migrations are numbered and additive — never rewrite a prior migration. New files must be the next serial `NNN_name.sql` after the highest existing `supabase/migrations/*.sql` version. Do **not** use `supabase migration new` (it creates 14-digit timestamps). `npm run verify:migrations` rejects timestamp filenames.
- **Env vars**: grouped by service in `.env.example`; `NEXT_PUBLIC_` reserved for browser-safe values.

---

## Development Workflow

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` (webpack) / `npm run dev:turbopack` |
| Lint | `npm run lint` (must be 0 warnings) |
| Typecheck | `npm run typecheck` |
| Migration namespace | `npm run verify:migrations` (rejects 14-digit timestamp filenames) |
| Unit tests | `npm test` / `npm run test:watch` / `npm test -- --coverage` |
| E2E tests | `npm run test:e2e` (excludes `@integration`) / `npm run test:e2e:integration` (real Supabase, manual-dispatch) |
| Build | `npm run build` (runs `next build --webpack` **then** `scripts/noindex-audit.ts` — fails the build on audit failure) |
| PDF regression check | `npm run verify:pdf` |
| Sitemap/noindex audit (standalone) | `npm run audit:noindex` |

**Deployment**: Vercel-native, triggered by pushing to the connected branch — this happens independently of CI result (CI does not gate Vercel deploys; see [docs/CI_CD_ARCHITECTURE.md](docs/CI_CD_ARCHITECTURE.md)). CI (`.github/workflows/ci.yml`) runs on every push and on PRs to `main`: lint → typecheck → unit tests → (parallel: e2e-auth, pdf-extract) → build → npm audit. No explicit deploy command in `package.json`. Unknown whether preview deploys run any gate beyond Vercel's default.

**Workflow**: branch → PR → squash-merge (repo enforces squash-only; merged branches auto-delete). Branch protection on `main` requires a one-time GitHub Pro upgrade — see [docs/BRANCH_PROTECTION_SETUP.md](docs/BRANCH_PROTECTION_SETUP.md) for exact required-check settings once upgraded.

---

## High Risk Systems

| System | Why risky | Verify before merging | Detail |
|---|---|---|---|
| Payments (Razorpay) | Real money; prior production incident from a verify/webhook race | `npx vitest run src/lib/razorpay/` | [docs/PAYMENTS.md](docs/PAYMENTS.md) |
| Speech/voice pipeline | Most actively-changed subsystem; history of silent-bug classes; only Chrome desktop is automated-verified | unit suite + manual `scripts/voice-fix-verify.mjs` + mobile smoke | [docs/VOICE.md](docs/VOICE.md) |
| Resume / PDF parsing | Entire funnel depends on extraction succeeding; Vercel serverless bundling has broken before | `npm run verify:pdf` | [docs/AI_PIPELINE.md](docs/AI_PIPELINE.md) |
| Auth (V2 migration) | Two auth code paths coexist behind a flag | test both flag states + `e2e/auth/*` | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Database / RLS | Migration 050 closed a real privilege-escalation gap | review new migrations against invariants above | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| SEO / indexing | Build fails if noindex/sitemap contradict | `npm run audit:noindex` | [docs/SEO.md](docs/SEO.md) |
| Analytics / funnel integrity | Founder dashboard + payment tracking depend on non-duplicated `product_events` | — | [docs/SEO.md](docs/SEO.md) |

---

## Working Rules

Claude should always:

1. **Read the relevant docs/*.md before editing** anything touching a High Risk System above.
2. **Find root cause before fixing** — this codebase documents root causes for every major incident (see `PAYMENT_ARCHITECTURE.md`, `docs/VOICE_PIPELINE_CERTIFICATION.md`); match that standard.
3. **Prefer minimal diffs** — no incidental refactors on production-critical paths.
4. **Explain reasoning**, particularly for anything touching a Critical Invariant.
5. **Preserve production behavior** — degrade-don't-fail is the house style; don't introduce a hard failure where the existing pattern is a logged fallback.
6. **Run verification before completion** — `npm run lint`, `npm run typecheck`, `npm test` at minimum, plus the domain-specific check from High Risk Systems when touching those areas.
7. **Never claim verification that wasn't actually run** — if a check needs a manual browser test, say so instead of asserting it passed.
8. **Never guess** — mark unverifiable claims "Unknown — not found in repository."
