# AI Boundaries — InterviewEra

**Read this before your first edit, whatever tool you are.** This document maps the repository into zones by edit risk, so a new AI session doesn't have to rediscover CLAUDE.md's invariants and the High Risk Systems table by trial and error. It does not replace CLAUDE.md — it is a navigation layer on top of it. Every claim below is sourced from CLAUDE.md, a `docs/*.md` file, or a file read directly during this task; nothing here is invented. Where the repository doesn't say, this document says **Unknown — not verified** rather than guessing.

---

## Read-first documentation (in this order)

1. **CLAUDE.md** — always, every session. Critical Invariants, High Risk Systems table, Working Rules.
2. **The relevant subsystem doc** before touching its files — `docs/PAYMENTS.md`, `docs/VOICE.md`, `docs/AI_PIPELINE.md`, `docs/ARCHITECTURE.md`, `docs/SEO.md`. This is CLAUDE.md Working Rule #1, made explicit here.
3. **`MASTER_ENGINEERING_ROADMAP.md`** — the single source of truth for what engineering work is planned and in what order. If a task looks like it belongs to a phase other than the one you were asked to implement, stop and say so rather than doing it anyway.
4. **`docs/FLAGS.md`** — before touching any environment-variable-gated behavior; before adding a new flag (a new flag with no exit-criteria entry there is a review rejection per the roadmap's standing rules).

## Do-not-edit zones (never modify without an explicit, separate human instruction naming the file)

| Zone | Why | Source |
|---|---|---|
| `supabase/migrations/*.sql` — any **existing** file | Migrations are numbered and additive; the codebase's own convention (and CLAUDE.md's Engineering Standards) is "never rewrite a prior migration." A new migration file is fine; editing an old one is not. | CLAUDE.md Engineering Standards; `docs/ARCHITECTURE.md` "DB convention lesson" |
| The redirect logic in `middleware.ts`, `vercel.json`, and `next.config.ts` | Triple-redundant www→apex/HTTP→HTTPS normalization is **deliberate defense-in-depth**, not duplication — changing one without checking the other two can create redirect loops or gaps. | CLAUDE.md Invariant #7; `docs/ARCHITECTURE.md` "Hidden dependencies" |
| `next.config.ts`'s `headers()` CSP block | Single source of truth for security headers; middleware does not duplicate them by design. | CLAUDE.md Invariant #8 |
| `src/lib/razorpay/**`, `src/app/api/payments/**` | Real money; a prior production incident (payment `pay_T1Xu1KmV48WWzM`) came from exactly this kind of unreviewed change. | CLAUDE.md Invariant #1; `docs/PAYMENTS.md` (full detail: `PAYMENT_ARCHITECTURE.md`) |
| `scripts/noindex-audit.ts` and its build-time gate | `npm run build` must never succeed with a noindex/sitemap contradiction — this script is the enforcement mechanism itself. | CLAUDE.md Invariant #6; `docs/SEO.md` |
| Credit RPCs (`deduct_credit`/`add_credit`/`refund_credit`) and any grant/RLS touching them | Must stay service-role-only; migration 050 closed a real privilege-escalation gap here. | CLAUDE.md Invariants #2, #10; `docs/ARCHITECTURE.md` "High risk: Database / RLS" |
| `guard_users_privileged_update()` and the `users` UPDATE column allowlist | No secondary defense layer exists — widening this for a non-service-role caller is the exact mistake migration 050 fixed. | CLAUDE.md Invariants #3, #10 |
| `.github/workflows/**` | CI/deploy machinery — out of scope for any task that doesn't explicitly name it (per the current engineering-platform program's own rule that CI changes are their own reviewed task). | `docs/CI_CD_ARCHITECTURE.md`; MASTER_ENGINEERING_ROADMAP.md task scoping pattern |

## Caution zone (read-only unless a task explicitly says otherwise)

| Zone | Why | Source |
|---|---|---|
| `src/lib/voice/{core,orchestrator,conversation,tts,audio}/**` and the `/interview/session/[id]/v2` route | A **live, parallel second implementation** of the voice pipeline exists alongside the production legacy stack. "A consolidation decision is pending" — do not extend either stack, do not delete the v2 stack, and do not assume the legacy stack is the only one that matters. The decision is scheduled (MASTER_ENGINEERING_ROADMAP.md Phase 3) but not yet made. | `docs/VOICE.md` "Architecture" + "Technical debt" |
| `NEXT_PUBLIC_AUTH_V2`-gated code (`src/lib/auth/*`, `src/app/auth/callback/route.ts`, `src/app/(auth)/*`) | Two auth logic paths coexist; a partial change or flag-flip mistake can silently break login/signup redirects for a subset of users. No measurable rollout-complete criterion exists yet (`docs/FLAGS.md`). | CLAUDE.md High Risk Systems table; `docs/ARCHITECTURE.md` "High risk: Auth V2 migration" |
| `CAMPUS_WORKSPACE_AUTO_APPROVE` and `src/lib/college/org-verification.ts` | No code-level production guard exists on this flag — it relies entirely on the operator not setting it in production. Treat any change here as security-relevant. | `docs/FLAGS.md` |

## Safe-to-edit zones (normal review discipline applies — still read the relevant subsystem doc if one exists)

Everything not listed above, most notably: `src/components/**` (outside the voice v2 caution zone), most of `src/hooks/**` (outside voice/mic/interview-session hooks — see High Risk Systems below), `src/lib/<domain>/**` for domains not named in a High Risk row, `src/app/(marketing)/**` content pages, `src/lib/seo/programmatic/**` (still subject to the sitemap-registration rule below), test files, and documentation.

## High Risk Systems (verify before merging, not just before editing)

Reproduced from CLAUDE.md's own table — this is the canonical source; if the two ever disagree, CLAUDE.md wins and this file is stale.

| System | Verify before merging | Detail |
|---|---|---|
| Payments (Razorpay) | `npx vitest run src/lib/razorpay/` + manually trace both verify-first and webhook-first orderings | `docs/PAYMENTS.md` |
| Speech/voice pipeline | Unit suite + manual `scripts/voice-fix-verify.mjs` (aliased as `npm run verify:voice`) + mobile smoke | `docs/VOICE.md` |
| Resume / PDF parsing | `npm run verify:pdf` | `docs/AI_PIPELINE.md` |
| Auth (V2 migration) | Both flag states + `e2e/auth/*` | `docs/ARCHITECTURE.md` |
| Database / RLS | Review new migrations against CLAUDE.md's Critical Invariants | `docs/ARCHITECTURE.md` |
| SEO / indexing | `npm run audit:noindex` | `docs/SEO.md` |
| Analytics / funnel integrity | Confirm server-side `product_events` persistence, not just client-side GA4 | `docs/SEO.md` |

## Files that require extra verification beyond lint/typecheck/test

- `src/lib/razorpay/activate-plan.ts`, `src/app/api/payments/{verify,webhook}/route.ts` — must be deployed atomically; the NULL-safe `last_payment_id` comparison is a documented pitfall (`docs/PAYMENTS.md` "Common mistakes").
- `src/app/api/interview/answer/route.ts` and anything in the evaluation fallback chain — CLAUDE.md Invariant #4 (never a null/missing score) is enforced here specifically.
- `src/lib/voice/mic-capture-coordinator.ts` and any code acquiring `getUserMedia` — CLAUDE.md Invariant #5; acquiring the mic outside the coordinator is the exact historical bug class (`docs/VOICE.md` "Common mistakes").
- Any new page/route under `src/app/(marketing)/**` or `src/lib/seo/programmatic/**` — must be registered in `src/lib/seo/sitemap/registry.ts` or the noindex audit will fail the build (`docs/SEO.md` "Common mistakes").
- Any new `supabase/migrations/*.sql` file — must pair RLS policies with matching table-level GRANTs in the same file (the migration-033 lesson, `docs/ARCHITECTURE.md` "DB convention lesson").

## Forbidden assumptions (myth → reality, each sourced)

- ❌ "`src/lib/openai/` means this code calls the OpenAI SDK directly." → ✅ It's OpenRouter-routed; the directory name is historical/misleading. (`docs/AI_PIPELINE.md`)
- ❌ "Mistral fallback activates automatically if OpenRouter fails." → ✅ It does not — `src/lib/mistral/` was deleted 2026-07-05 (zero importers even before removal). (CLAUDE.md Invariant #9)
- ❌ "The `/interview/session/[id]/v2` route is unused, safe to repurpose or delete casually." → ✅ It's a live, deliberate parallel implementation awaiting a scheduled decision — leave it alone unless the task explicitly is that decision. (`docs/VOICE.md`; MASTER_ENGINEERING_ROADMAP.md Phase 3)
- ❌ "CI passing means it's safe to deploy / already deployed safely." → ✅ CI does not gate Vercel deploys — a push to `main` deploys independently of CI result. (`docs/CI_CD_ARCHITECTURE.md`)
- ❌ "This is just a comment/doc/copy change, no need to run verification." → ✅ Still run lint/typecheck at minimum; if the change is in a High Risk System's doc, treat the accuracy of that doc as production-relevant (an AI reading a wrong doc later *is* a production risk).
- ❌ "Existing test coverage means this module is well-tested." → ✅ Email providers and `src/lib/supabase/server.ts` are at 0% coverage as of the last verified certification. (`docs/ARCHITECTURE.md` "Testing strategy")
- ❌ "`RESUME_OCR_ENABLED` unset means OCR is off (safe default assumption)." → ✅ Opposite polarity — unset means **on**. Always check a flag's actual default in `docs/FLAGS.md`, don't infer from the name. (`docs/FLAGS.md`)
- ❌ "The `anon` Supabase role only has narrow, obviously-safe SELECT access." → ✅ It has a blanket SELECT grant from migration 001 that migration 050 did not revisit — treat this as an open question, not a known-safe fact, until MASTER_ENGINEERING_ROADMAP.md's Phase 1A.6 enumeration lands. (`docs/ARCHITECTURE.md` "Database architecture")

## Production invariants — cross-reference

The 10 numbered invariants live in **CLAUDE.md, Critical Invariants section** — that is the canonical text; do not copy it here where it can drift out of sync. Consult it directly. This document's job is the zone map above, not a second copy of the invariants themselves.
