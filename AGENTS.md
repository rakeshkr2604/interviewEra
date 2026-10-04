# AGENTS.md — InterviewEra Agent Contract

> Status: CANONICAL
> Last Verified: 2026-10-04
> Verification Scope: Agent governance + architecture facts reverse-engineered from code + multi-phase Git/hygiene gates + sequential migration apply rules
> Authority: **Universal source of truth for all AI agents** (Cursor, Claude, others). Thin adapters (`CLAUDE.md`, `.cursorrules`) point here — they must not diverge.

## Purpose

Operating contract for any agent working in this repo. Read this **first** every session. Detail lives under `docs/`; this file is the short contract + routing map.

Where something cannot be verified from the repository, say **"Unknown — not found in repository"** — never guess.

---

## Source-of-truth hierarchy

When sources conflict, higher wins:

1. **Running / checked-in application code** (`src/`, `e2e/`)
2. **Live database schema** (applied migrations + production shape)
3. **Migration history** (`supabase/migrations/*.sql`) — additive truth of how we got here
4. **Automated tests** (Vitest / Playwright) — executable behavior contracts
5. **Runtime config** (`.env.example`, `vercel.json`, `next.config.ts`, flags)
6. **Canonical docs** (`AGENTS.md`, `docs/Core|Guidelines|Operations/**`)
7. **Historical / archive** (`docs/archive/**`) — context only, never current SoT

Roadmap order of *planned work*: [`MASTER_ENGINEERING_ROADMAP.md`](MASTER_ENGINEERING_ROADMAP.md). Do not silently expand into another phase.

---

## Current architecture (summary)

| Layer | Choice |
|---|---|
| App | Next.js `^16` App Router · TypeScript strict · React `^19` · Tailwind v4 |
| Data | Supabase Postgres + RLS · Supabase Auth (email + Google OAuth) |
| AI | OpenRouter-routed LLMs only (no Mistral fallback) |
| Voice | Deepgram STT + Web Speech + ElevenLabs TTS · `micCaptureCoordinator` |
| Payments | Razorpay dual-path activation |
| Infra | Resend · Upstash Redis · GA4 + Clarity + Vercel Analytics · Vercel host |

**Interview engine (CURRENT):** **V2.1 script engine** (`interviews.engine = 'v2.1'`).

| Step | Path |
|---|---|
| Entry UI | `/interview/script/start` |
| Start API | `POST /api/interview/script/start` |
| Session UI | `/interview/script/[id]` |
| Turn APIs | `session`, `turn` (±SSE), `auto-structure`, `answer-score`, `complete`, `report` |
| Tables | `interviews` (+ v2.1 cols), `script_turns`, `answer_evaluations`, `script_interview_reports`, `resume_interview_snapshots` |

Scripts: `SCRIPT_H` / `SCRIPT_T` / `SCRIPT_M`. Detail: [`docs/Core/INTERVIEW_ENGINE.md`](docs/Core/INTERVIEW_ENGINE.md).

**Legacy V1 dual-agent: REMOVED** in this change set. Historical migrations for V1 tables remain. Legacy `/report/[id]` may remain for historical rows. Experimental `/interview/session/[id]/v2` was a **VOICE rewrite of V1**, not script v2.1 — removed with V1. See DEC in [`docs/Core/DECISIONS.md`](docs/Core/DECISIONS.md).

---

## Critical invariants (short)

Full meanings preserved — do not bypass. Detail in linked Core docs.

1. Plan activation marker = **`users.last_payment_id === paymentId`** (never `payments.status`) → [PAYMENTS](docs/Core/PAYMENTS.md)
2. Credit RPCs + `credit_transactions` inserts = **service-role-only**
3. `users` UPDATE allowlist via **`guard_users_privileged_update()`** — never widen for non-service-role
4. Interview scores: **never null/missing** — neutral fallback → [AI_PIPELINES](docs/Core/AI_PIPELINES.md) / [INTERVIEW_ENGINE](docs/Core/INTERVIEW_ENGINE.md)
5. **`micCaptureCoordinator`** — never simultaneous `getUserMedia` + Web Speech → [VOICE_PIPELINE](docs/Core/VOICE_PIPELINE.md)
6. Do not bypass **`scripts/noindex-audit.ts`** on build → [SEO_AEO_GEO](docs/Core/SEO_AEO_GEO.md)
7. Canonical host triple-redundant: `vercel.json` + `src/proxy.ts` + `next.config.ts`
8. CSP SoT = `next.config.ts` `headers()`
9. **Mistral is not a fallback** — `src/lib/mistral/` deleted; ignore `MISTRAL_API_KEY` env as live path
10. No bypass of guard / campus `verification_status` / `ADMIN_EMAILS`|`platform_role` admin checks

---

## High-risk systems

| System | Why | Verify | Doc |
|---|---|---|---|
| Payments | Real money; prior verify/webhook incident | `npx vitest run src/lib/razorpay/` + dual-order mental trace | [Core/PAYMENTS](docs/Core/PAYMENTS.md) |
| Voice | Silent-bug classes; Chrome desktop only in CI | unit + `npm run verify:voice` + mobile smoke | [Core/VOICE_PIPELINE](docs/Core/VOICE_PIPELINE.md) |
| Resume / PDF | Funnel depends on extract; serverless bundling | `npm run verify:pdf` | [Core/RESUME_PIPELINE](docs/Core/RESUME_PIPELINE.md) |
| Auth V2 | Two paths behind flag | both flag states + `e2e/auth/*` | [Core/SYSTEM_DESIGN](docs/Core/SYSTEM_DESIGN.md) |
| Database / RLS | Migration 050 closed privilege gap | review migrations vs invariants | [Core/BACKEND_SCHEMA](docs/Core/BACKEND_SCHEMA.md), [Guidelines/DATABASE_MIGRATIONS](docs/Guidelines/DATABASE_MIGRATIONS.md) |
| SEO / indexing | Build fails on noindex/sitemap contradiction | `npm run audit:noindex` | [Core/SEO_AEO_GEO](docs/Core/SEO_AEO_GEO.md) |
| Analytics | Funnel SoT = server `product_events` | no duplicate payment events | [Core/SEO_AEO_GEO](docs/Core/SEO_AEO_GEO.md) |

**Never edit a High Risk System without reading its Core doc first.**

---

## Documentation routing

| Task | Read |
|---|---|
| Any session start | This file → [`docs/INDEX.md`](docs/INDEX.md) |
| Interview / script engine | `docs/Core/INTERVIEW_ENGINE.md` |
| LLM / eval / report | `docs/Core/AI_PIPELINES.md` |
| Mic / STT / TTS | `docs/Core/VOICE_PIPELINE.md` |
| Resume upload/parse | `docs/Core/RESUME_PIPELINE.md` |
| Razorpay / credits grant | `docs/Core/PAYMENTS.md` |
| New migration | `docs/Guidelines/DATABASE_MIGRATIONS.md` + `.cursor/rules/supabase-migrations.mdc` |
| Flags | `docs/Operations/FEATURE_FLAGS.md` |
| Ship / CI | `docs/Operations/RELEASE.md`, `QUALITY_GATES.md` |
| Multi-phase work / push / merge | `docs/Guidelines/ENGINEERING_WORKFLOW.md` |
| Doc process | `docs/Guidelines/DOCUMENTATION_GOVERNANCE.md` |

Edit-risk zones (do-not-edit / caution / safe): [`docs/Guidelines/CODE_ORGANIZATION.md`](docs/Guidelines/CODE_ORGANIZATION.md).

---

## Coding standards (summary)

- TypeScript `strict`; `@/*` → `src/*`; Zod at API + AI boundaries
- Server Components default; `"use client"` only for state/effects/browser APIs
- Domain folders: `src/lib/<domain>/`; tests `*.test.ts` beside code
- Degrade-don't-fail on user-critical paths; typed errors for known domains
- Structured logs with existing prefixes (`[payment:*]`, `[VOICE_PIPELINE]`, …)
- Migrations: next serial `NNN_snake_case.sql` only — never rewrite; never `supabase migration new`
- `NEXT_PUBLIC_*` = browser-safe only

---

## Database migration contract (mandatory)

Full procedure: [`docs/Guidelines/DATABASE_MIGRATIONS.md`](docs/Guidelines/DATABASE_MIGRATIONS.md). Non-negotiable rules for every agent:

1. **Naming:** new files are `NNN_snake_case.sql` (e.g. `109_…`, `112_…`, `113_…`). Next `NNN` = highest existing serial in `supabase/migrations/` + 1 — confirm with `npm run verify:migrations` (prints the next required name).
2. **Never** use `supabase migration new`, 14-digit timestamps, reused versions, or renumbered history.
3. **Never rewrite** a migration already applied to any shared environment — add a follow-on serial file.
4. **Audit before apply:** compare repo files to staging and production `schema_migrations` **and** probe live schema. Match historical timestamp ledger rows by migration **name** when serial versions differ. Confirm project identity (name + ref) independently.
5. **Staging first**, then production — only after staging ledger + schema verification succeeds and production is re-queried against the same plan.
6. **Success evidence** must include ledger rows **and** schema/security probes. A CLI/MCP exit code alone is not enough.
7. **Drift:** if schema effects already exist but the ledger is missing/mismatched, do not invent silent ledger INSERTs and do not blindly re-run non-idempotent SQL — document and follow DATABASE_MIGRATIONS recovery rules.
8. Do not create dummy migrations for application-only changes.

---

## Verification standards

Minimum before done: `npm run lint` (0 warnings) + `npm run typecheck`.

| Touch | Also run |
|---|---|
| Payments | `npx vitest run src/lib/razorpay/` |
| PDF / resume extract | `npm run verify:pdf` |
| Voice | unit suite + `npm run verify:voice` (+ say if mobile smoke still needed) |
| SEO routes / sitemap | `npm run audit:noindex` or full `npm run build` |
| Migrations | `npm run verify:migrations` |
| Docs links / stale refs | `npm run verify:docs` |
| General logic | `npm test` |

**Never claim a check ran if it did not.** Manual browser / device tests: state explicitly.

Do **not** modify production app code (`src/`, `e2e/`, `supabase/migrations`) when the task is docs-only. Do **not** bypass Critical Invariants to “make it work.”

---

## Documentation update contract

Every change that affects architecture, APIs, schema, flags, or ops must update the matching canonical doc in the **same PR/change set**. See [`DOCUMENTATION_GOVERNANCE.md`](docs/Guidelines/DOCUMENTATION_GOVERNANCE.md).

Mandatory completion section (include in the agent’s final report):

### Documentation Impact

- **Docs updated:** …
- **Docs created:** …
- **Docs archived/moved:** …
- **Docs intentionally unchanged (and why):** …
- **`npm run verify:docs`:** PASS / FAIL / not run (why)

---

## Completion protocol

1. Root-cause before fix; minimal diffs; preserve degrade-don't-fail behavior
2. Run verification for touched domains
3. Fill **Documentation Impact** above
4. If High Risk: name the Core doc you read

### Multi-phase Git / hygiene (summary)

Detail: [`docs/Guidelines/ENGINEERING_WORKFLOW.md`](docs/Guidelines/ENGINEERING_WORKFLOW.md).

- Preserve the loop: DISCOVER → VERIFY → PLAN → IMPLEMENT → TEST → AUDIT → UPDATE DOCUMENTATION → VERIFY DOCUMENTATION → REPORT (+ phase report).
- **Deferred push:** do not push intermediate phase commits during an in-progress multi-phase task unless the user explicitly authorizes an earlier push. Local commit ≠ on GitHub ≠ deployed.
- Do not amend / reset / rebase / squash / rewrite history without explicit authorization. Preserve unrelated dirty/untracked files.
- After all planned phases: **repository hygiene** → **pre-push verification** → push only with **explicit authorization** (normal non-force push). If remote diverged → stop and request review.
- **Pre-merge hygiene** after push; merge only with **explicit authorization**. Push ≠ merge approval.
- **Post-merge:** verify expected tip / CI / deploy as in scope; no unverified impact claims.

Adapters: [`CLAUDE.md`](CLAUDE.md) · [`.cursorrules`](.cursorrules) · index [`docs/INDEX.md`](docs/INDEX.md)
