# INTERVIEWERA PROJECT AUDIT REPORT
**Date:** 2026-04-05
**Auditor:** Claude Code
**PRD Version:** 2.0

## EXECUTIVE SUMMARY
- Total checks run: 64
- Passed: 52
- Failed: 8
- Warnings: 4
- Critical Issues: 3

---

## CRITICAL ISSUES (Fix before .env values are used in production)

### C1 — `plan_tier` enum never gets `campus_admin` added at DB level
- **File:** `supabase/migrations/005_campus.sql`
- **Problem:** Migration 001 creates `plan_tier` as `ENUM('free','starter','pro','campus')`. Migration 005 references `campus_admin` in comments and RLS policies but never executes `ALTER TYPE plan_tier ADD VALUE 'campus_admin'`. Any INSERT or UPDATE that sets `plan_tier = 'campus_admin'` will throw a PostgreSQL enum constraint error at runtime.
- **Fix:** Add this line at the top of `005_campus.sql`:
  ```sql
  ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'campus_admin';
  ```

### C2 — `referral_code` column queried but never created in any migration
- **File:** `src/app/api/referral/apply/route.ts:45`
- **Problem:** The referral route queries `.eq('referral_code', referralCode)` on the `users` table. No migration adds this column. The query silently returns `null` on every call, making the entire referral system non-functional.
- **Fix:** Add a new migration (or append to 002):
  ```sql
  ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE
    DEFAULT encode(gen_random_bytes(6), 'hex');
  ```

### C3 — Real API keys present in `.env.local` + unauthorized provider key
- **File:** `.env.local`
- **Problem:** File contains live credentials — OpenAI key (`sk-proj-...`), Supabase service role key, Razorpay test keys, Resend API key. Additionally, `OPENROUTER_API_KEY` is present. This is an unauthorized AI provider (CLAUDE.md mandates single AI provider: GPT-4o-mini only). The key is not referenced in source code but its presence is unexplained and violates the single-provider rule.
- The file IS gitignored (`.env*` pattern). However, if `.env.local` was ever copied or shared, all keys should be rotated.
- **Fix:** Remove `OPENROUTER_API_KEY` from `.env.local`. If keys were shared outside this machine, rotate: OpenAI, Supabase service role, Resend.

---

## HIGH PRIORITY ISSUES

### H1 — 87 ESLint errors across the codebase
- `npm run lint` reports 87 errors, 4 warnings. Build still succeeds but these are real bugs:
  1. `src/app/(dashboard)/interview/[id]/InterviewSession.tsx:91` — `react-hooks/no-use-before-define`: `completeInterview()` is called before its function declaration. Works at runtime due to hoisting but is fragile.
  2. Several hooks/components call `setState` synchronously inside `useEffect` — causes React cascading-render warnings and potential infinite loops.
  3. ~70+ `react/no-unescaped-entities` in blog files — apostrophes and quotes in raw JSX text will render as broken characters in some browsers.
- **Fix:** Run `npm run lint` and fix each error. For unescaped entities, wrap characters in `{&apos;}` or use `&quot;`.

### H2 — BlurredSection renders gated content in the DOM (revenue leak)
- **File:** `src/components/report/BlurredSection.tsx:34`
- **Problem:** The blur is CSS-only (`blur-sm`). The actual model answer and detailed analysis content is rendered in the DOM and is readable by any user who opens DevTools. For a paid-gating feature this is a material revenue issue.
- **Fix:** For locked users, render a placeholder skeleton instead of `{children}`:
  ```tsx
  if (!hasAccess) {
    return (
      <div className="space-y-2">
        <div className="h-4 rounded bg-gray-100 animate-pulse w-3/4" />
        <div className="h-4 rounded bg-gray-100 animate-pulse w-1/2" />
        {/* upgrade CTA */}
      </div>
    );
  }
  ```

### H3 — Missing security headers in `next.config.ts`
- **File:** `next.config.ts`
- **Problem:** No `headers()` export. X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, and Referrer-Policy are all absent. Any production Vercel deployment is missing baseline browser security hardening.
- **Fix:** Add to `next.config.ts`:
  ```ts
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  }
  ```

### H4 — `.env.example` missing Phase 4 env vars
- **File:** `.env.example`
- **Problem:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `MISTRAL_API_KEY` are not documented. A new developer following `.env.example` will deploy without Redis (rate limiting silently disabled, question cache disabled) and without Mistral fallback.
- **Fix:** Add the three vars with placeholder values to `.env.example`.

---

## WARNINGS (Non-blocking, should fix before launch)

### W1 — A/B flag can override "first interview = 6 questions" rule
- **File:** `src/lib/analytics/flags.ts:47`
- CLAUDE.md states: "First interview ALWAYS: 6 questions". The PostHog `first_interview_questions` flag can return variant `"4"`, causing some users to get 4-question first interviews. This deviates from the PRD. Confirm this A/B test is approved.

### W2 — `console.log` in production API route
- **File:** `src/app/api/interview/answer/route.ts:105`
- One `console.log` logs the AI provider name per evaluation. All other console calls in the codebase correctly use `console.error`/`console.warn`. Normalize to `console.info` or a structured logger.

### W3 — `resumeUploadSchema` validates only `userId`, not file metadata
- **File:** `src/lib/validations/schemas.ts:3`
- File size and type validation is done manually in the upload route handler (which is correct), but the Zod schema only validates `userId`. Minor inconsistency — the validation is present, just not co-located in the schema layer.

### W4 — Load test uses a shared `QUESTION_ID` across all VUs
- **File:** `load-tests/answer-endpoint.js`
- All 500 VUs submit answers to the same `questionId`. There is no UNIQUE constraint on `answers.question_id` so this will not error, but the test will produce unrealistic DB write patterns. Use multiple seed question IDs for a more realistic test.

---

## PASSED CHECKS

- All 10 required DB tables present (users, resumes, interviews, questions, answers, evaluations, reports, subscriptions, referrals, credit_transactions)
- RLS enabled on all 10 tables
- All RLS policies use `auth.uid()` — no hardcoded IDs
- GIN index present on `resumes.parsed_data`
- Correct DB defaults: `credits_remaining = 5`, `plan_tier = 'free'`, `question_count = 6`, `status = 'pending'`
- All required folders present — all expected route group paths confirmed
- All required dependencies installed: @supabase/supabase-js, @supabase/ssr, openai, pdf-parse, razorpay, resend, zod, recharts, lucide-react, posthog-js
- No forbidden dependencies (no express, prisma, drizzle, mongoose, axios, @tanstack/react-query)
- No hardcoded secrets in any `.ts`/`.tsx` source file
- No `dangerouslySetInnerHTML` or `innerHTML` usage anywhere in the codebase
- No `as any` or `: any` TypeScript usage — zero results
- Auth session verified in every API route (`supabase.auth.getUser()` before any logic)
- Service role key (`createServiceClient`) never used in client-side code — only in API routes
- Webhook signature verified with `verifyWebhookSignature()` using `RAZORPAY_WEBHOOK_SECRET`
- Webhook idempotency: duplicate activation checked via `razorpay_sub_id`, duplicate charge via `payment.id` in credit transaction reason
- Zod `safeParse` called in every API route that accepts a request body
- No raw SQL — all queries use Supabase SDK
- No unauthorized `NEXT_PUBLIC_` client-side exposure of secrets
- Credit deduction is atomic via PostgreSQL RPC (`deduct_credit`) — prevents race conditions
- Credits deducted on interview START, not completion
- Every credit action logged to `credit_transactions`
- Resume parsing pipeline follows correct order: auth → file validation → upload → DB record → extract text → AI parse → update status
- Parse failure returns `resumeId` with `status: failed` (graceful degradation, not a 500)
- All 3 AI prompt templates match CLAUDE.md exactly (resume parse, question gen, evaluation)
- All 3 AI responses validated as JSON before storage with `isValidXxx()` guards
- OpenAI retry: exponential backoff (1s → 2s → 4s), max 3 attempts, retries on 429/5xx only
- `OpenAIUnavailableError` carries correct user-facing message "AI temporarily unavailable. Try again in 30 seconds."
- Mistral fallback wired correctly — only triggers after `OpenAIUnavailableError` is thrown
- `getFirstInterviewQuestionCount()` defaults to 6 — correct
- All 5 required PostHog events present: `resume_uploaded`, `interview_started`, `interview_completed`, `report_viewed`, `upgrade_cta_clicked`
- Pricing matches PRD: Starter ₹99/mo, Pro ₹249/mo, Starter annual ₹799/yr, Pro annual ₹1,999/yr, Campus ₹799/student/yr
- Referral: both referrer and referred receive +1 credit
- Referral: credit only after referred user's first interview completion (verified by completed interview count check)
- Referral: idempotency — duplicate credit blocked via `status = 'credited'` check
- `npx tsc --noEmit` → 0 TypeScript errors
- `npm run build` → succeeded, all routes compiled
- Browser Supabase client uses `createBrowserClient` from `@supabase/ssr`
- Server Supabase client uses `createServerClient` from `@supabase/ssr`
- Both Supabase clients use env vars — no hardcoded URLs
- Middleware protects all non-public routes; correct exclusions for /, /login, /signup, /campus, /tools/*

---

## SECTION-BY-SECTION STATUS

### A. Filesystem & Structure: PASS
- Missing files/folders: None
- All required API route folders, component folders, lib folders, type files, and migration files present

### B. Database Schema: PASS (with blocking caveats)
- Tables found: 10/10
- Tables with RLS: 10/10
- Missing RLS: None
- Schema deviations from CLAUDE.md:
  - `plan_tier` enum does not include `campus_admin` (critical — migration never adds it)
  - `users` table missing `referral_code` column (critical — referral system broken)

### C. Security: PARTIAL
- Hardcoded secrets in source code: NO — source is clean
- Hardcoded secrets in `.env.local`: YES — real credentials present (gitignored)
- Unauthorized provider key: YES — `OPENROUTER_API_KEY` in `.env.local`
- Unauthenticated API routes: None
- Webhook signature verification: PRESENT
- Input validation (Zod): PRESENT on all body-accepting routes
- Client-side secret exposure: None
- Security headers: MISSING — no headers() in next.config.ts

### D. Business Logic: PARTIAL
- Credit system transaction-safe: YES — PostgreSQL RPC
- AI prompts match CLAUDE.md templates: YES
- Retry logic correct: YES
- Tier gates implemented: PARTIAL — logic correct, but content is CSS-blurred (in DOM)
- First interview = 6 questions: YES (default), A/B flag can override to 4 (W1)

### E. TypeScript Quality: PASS
- TypeScript errors: 0
- `any` type usages: 0
- `console.log` usages in production code: 1 (minor, W2)
- API routes with missing error handling: None — all have try/catch

### F. Next.js: PASS (with warning)
- Middleware protecting dashboard routes: YES
- Server/Client component split: CORRECT
- Build status: SUCCESS
- Security headers: MISSING (H3)

### G. PRD Compliance: PASS (with caveats)
- Pricing values correct: YES
- Phase scope respected: YES — Voice (Phase 3) and Mistral (Phase 4) correctly present
- PostHog events implemented: YES — all 5 required events
- Referral logic correct: YES in code, broken at DB level (missing column — C2)

---

## BEFORE ADDING .ENV VALUES — MUST FIX LIST

1. Add `ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'campus_admin';` to `supabase/migrations/005_campus.sql`
2. Create a migration that adds `referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex')` to `public.users`
3. Remove `OPENROUTER_API_KEY` from `.env.local` (unauthorized provider)
4. Fix 87 ESLint errors — priority: unescaped entities in blog files, `completeInterview` use-before-define in `InterviewSession.tsx`
5. Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `MISTRAL_API_KEY` to `.env.example`
6. Add security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) to `next.config.ts`
7. Fix `BlurredSection` to not render gated content in the DOM for locked users

---

## AFTER .ENV VALUES — MANUAL TEST CHECKLIST

1. Sign up with email → verify `public.users` row created with 5 credits, `referral_code` auto-generated
2. Upload PDF resume → verify parse completes < 8s, `parsed_data` JSONB saved, `status = parsed`
3. Start interview → verify 1 credit deducted, 6 questions returned, `interviews.status = in_progress`
4. Answer all 6 questions → verify evaluations stored with all 5 dimension scores
5. Complete interview → verify `interviews.status = completed`, `reports` row created
6. View score report → verify radar chart renders, `report_viewed` PostHog event fires
7. Verify Free user sees blurred Detailed Analysis — open DevTools and confirm model answer text is NOT in the DOM
8. Test referral link flow: create 2 accounts, apply referral code after first interview — both should get +1 credit
9. Test Razorpay checkout with test mode keys → verify webhook upgrades plan and credits correctly
10. Verify rate limiting: submit 6 answers in rapid succession → 6th request should return HTTP 429 with `Retry-After` header
11. Test campus admin flow: set a user `plan_tier = 'campus_admin'` and create a `campus_organizations` record → `/admin/dashboard` should load correctly
12. Test bulk invite: upload a CSV of emails → verify `campus_invites` rows created, invite emails sent via Resend

---

## QUICK FIX SUMMARY TABLE

| Priority | Issue | File | Fix |
|---|---|---|---|
| CRITICAL | `campus_admin` not in DB enum | `supabase/migrations/005_campus.sql` | Add `ALTER TYPE plan_tier ADD VALUE IF NOT EXISTS 'campus_admin'` |
| CRITICAL | `referral_code` column missing | New migration needed | `ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex')` |
| CRITICAL | `OPENROUTER_API_KEY` in `.env.local` | `.env.local` | Remove key; rotate if shared |
| HIGH | 87 ESLint errors | Blog files, `InterviewSession.tsx` | Run `npm run lint` and fix all errors |
| HIGH | BlurredSection: content in DOM | `src/components/report/BlurredSection.tsx` | Render placeholder skeleton instead of `{children}` for locked users |
| HIGH | No security headers | `next.config.ts` | Add `headers()` with X-Frame-Options, nosniff, Referrer-Policy |
| HIGH | Phase 4 env vars missing from `.env.example` | `.env.example` | Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `MISTRAL_API_KEY` |
| WARN | A/B flag overrides 6-question rule | `src/lib/analytics/flags.ts` | Confirm with product if variant=4 is approved |
| WARN | `console.log` in answer route | `src/app/api/interview/answer/route.ts:105` | Change to `console.info` |
