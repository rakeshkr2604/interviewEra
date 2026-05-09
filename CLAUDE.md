# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# InterviewEra Project Rules & Context

## ⚠️ MANDATORY: READ THIS BEFORE WRITING ANY CODE OR PLAN

You are a senior full-stack engineer working on **InterviewEra** — an AI-powered placement 
preparation SaaS for Indian students. This is a production project, not a tutorial or demo.

---

## PROJECT IDENTITY (NEVER FORGET)
- **Product:** InterviewEra — AI Mock Interview + Feedback platform
- **PRD Version:** 2.0 (March 31, 2026)
- **Stage:** MVP Development — Phase 1 of 4
- **Target Users:** Final-year B.Tech/BCA/MBA students, Tier 1–3 Indian colleges, age 20–24
- **North Star Metric:** Interviews completed per user in first 14 days (target: 4+)

---

## TECH STACK — USE EXACTLY THIS, NO DEVIATIONS WITHOUT APPROVAL

| Layer         | Technology                     | Version/Notes                        |
|---------------|-------------------------------|--------------------------------------|
| Frontend      | Next.js (App Router)          | v14+ with TypeScript                 |
| Styling       | Tailwind CSS + shadcn/ui      | No other UI libraries unless asked   |
| Backend       | Next.js API Routes + Server Actions | No separate Express/FastAPI   |
| Database      | PostgreSQL via Supabase        | With Row Level Security (RLS)        |
| Auth          | Supabase Auth                  | Email/password + Google OAuth        |
| AI Layer      | GPT-4o-mini (OpenAI API only) | NO multi-provider in Phase 1–3       |
| Payments      | Razorpay                       | UPI + card + netbanking              |
| File Storage  | Supabase Storage               | For resume PDFs + exports            |
| Hosting       | Vercel                         | Edge functions enabled               |
| Analytics     | Vercel Analytics (+ Speed Insights) | MVP: no third-party product analytics SDK |
| Email         | Resend                         | Transactional only                   |
| PDF Parsing   | pdf-parse (npm)                | Phase 1 only                         |

---

## ARCHITECTURE PRINCIPLES — NEVER VIOLATE

1. **DECOUPLED PARSING:** Resume parsing happens on UPLOAD, not on interview start.
   - Parse once → store JSON in `resume_parsed_data` (JSONB column)
   - Interview start reads from stored JSON, never re-parses
   - Target: Parse completes < 8 seconds

2. **TEXT-FIRST:** Voice/STT is P1 (Phase 3), NOT P0. Never implement voice in Phase 1–2.

3. **SINGLE AI PROVIDER:** GPT-4o-mini only. No Mistral, no Llama, no fallback chains in Phase 1–3.
   - Error handling: exponential backoff (1s → 2s → 4s), max 3 retries
   - After all retries: show "AI temporarily unavailable. Try again in 30 seconds."

4. **CREDIT-BASED MODEL:** No free trials. Credits only.
   - Free: 5 credits (lifetime)
   - Starter (₹99/mo): 12 credits/month
   - Pro (₹249/mo): 30 credits/month
   - Credits deduct on interview START, not completion

5. **FIRST INTERVIEW = 6 QUESTIONS ONLY** (not 10). Reduces abandonment.

6. **RLS ON EVERYTHING:** Every Supabase table must have RLS policies. Users see only their data.

---

## PRICING TIERS (MEMORIZE THIS)

| Feature               | Free      | Starter ₹99/mo | Pro ₹249/mo | Campus ₹799/student/yr |
|-----------------------|-----------|----------------|-------------|------------------------|
| Interview Credits     | 5 (total) | 12/month        | 30/month    | Unlimited              |
| Score Report          | Basic      | Full feedback   | Full + Analysis | Full + Cohort      |
| Detailed Analysis     | BLURRED   | BLURRED         | ✅ Visible  | ✅ Visible             |
| Model Answer Compare  | BLURRED   | BLURRED         | ✅ Visible  | ✅ Visible             |
| PDF Export            | ❌        | ❌              | ✅          | ✅                     |
| Interview Replay      | ❌        | ❌              | ✅          | ✅                     |

---

## DATABASE SCHEMA (CANONICAL — DO NOT ALTER WITHOUT EXPLICIT INSTRUCTION)

```sql
-- Core Tables (10 total)
users (id, email, name, plan_tier, credits_remaining, placement_date, created_at)
resumes (id, user_id, file_url, raw_text, parsed_data JSONB, status, created_at)
interviews (id, user_id, resume_id, role, difficulty, question_count, status, started_at, completed_at)
questions (id, interview_id, order_index, question_text, rubric JSONB, category)
answers (id, question_id, answer_text, answer_mode, submitted_at)
evaluations (id, answer_id, overall_score, dimension_scores JSONB, feedback_text, detailed_analysis JSONB)
reports (id, interview_id, overall_score, radar_data JSONB, trend_data JSONB, generated_at)
subscriptions (id, user_id, plan, razorpay_sub_id, status, current_period_start, current_period_end)
referrals (id, referrer_id, referred_id, status, credited_at)
credit_transactions (id, user_id, type, amount, reason, created_at)
```

---

## EVALUATION DIMENSIONS (AI SCORING RUBRIC)

| Dimension            | Weight | What It Measures                                      |
|----------------------|--------|-------------------------------------------------------|
| Communication Clarity | 20%   | Sentence structure, conciseness, professional language|
| Technical Depth      | 25%   | Accuracy, depth of explanation, correct terminology   |
| Answer Structure     | 20%   | Logical flow, STAR method, clear beginning/middle/end |
| Confidence           | 15%   | Assertiveness, no hedging language, directness        |
| Relevance            | 20%   | Alignment with question, use of relevant experience   |

---

## AI PROMPT TEMPLATES (USE EXACTLY, DO NOT IMPROVISE)

### Template 1: Resume Parsing

```
You are a resume parsing engine. Extract structured information from the following resume text.
Return ONLY valid JSON. No explanation, no markdown, no preamble.

Schema:
{
  "name": string,
  "email": string,
  "phone": string,
  "skills": string[],
  "experience": [{
    "company": string, "role": string, "duration": string, "description": string
  }],
  "projects": [{
    "name": string, "tech_stack": string[], "description": string
  }],
  "education": [{
    "degree": string, "institution": string, "year": string, "cgpa": string
  }],
  "target_roles": string[]
}

Resume text:
{RESUME_TEXT}
```

### Template 2: Question Generation

```
You are an expert technical interviewer at a top Indian tech company.
Generate exactly {QUESTION_COUNT} interview questions for a {ROLE} position.
The candidate's profile: {PARSED_RESUME_SUMMARY}
Difficulty level: {DIFFICULTY}

Rules:
- Questions must be specific to the candidate's actual projects and skills
- Mix: 40% technical, 30% behavioral, 30% situation-based
- No repetitive questions
- Each question must have a rubric for evaluation

Return ONLY valid JSON:
{
  "questions": [{
    "order": number,
    "question_text": string,
    "category": "technical" | "behavioral" | "situational",
    "rubric": {
      "ideal_keywords": string[],
      "ideal_structure": string,
      "red_flags": string[]
    }
  }]
}
```

### Template 3: Answer Evaluation

```
You are an expert interview evaluator. Score the following answer strictly and fairly.

Question: {QUESTION_TEXT}
Rubric: {RUBRIC_JSON}
Candidate's Answer: {ANSWER_TEXT}

Score each dimension from 1–10 (1=very poor, 10=excellent).
Be strict. A score of 7+ means genuinely good. Do not inflate scores.

Return ONLY valid JSON:
{
  "overall_score": number (weighted average),
  "dimension_scores": {
    "communication_clarity": number,
    "technical_depth": number,
    "answer_structure": number,
    "confidence": number,
    "relevance": number
  },
  "feedback_text": string (2–3 sentences, specific and actionable),
  "detailed_analysis": {
    "strengths": string[],
    "improvements": string[],
    "model_answer_hint": string,
    "keywords_missing": string[]
  }
}
```

---

## ANTI-HALLUCINATION RULES (CRITICAL)

1. **NEVER invent libraries** not in the tech stack above
2. **NEVER assume** Supabase table columns exist unless specified in schema above
3. **NEVER skip** RLS policy when creating any new table
4. **NEVER use** `any` type in TypeScript — always properly type everything
5. **NEVER hardcode** API keys or secrets — always use environment variables
6. **ALWAYS verify** that code compiles before presenting it (trace through mentally)
7. **ALWAYS implement** error handling — no try/catch without proper error logging
8. **NEVER implement** features beyond the current phase's scope
9. **If unsure about a business rule:** stop and ask, don't invent

---

## PHASE TRACKER (Update this as we progress)

- [ ] Phase 1 — Week 1–2: Project Setup + DB + Auth + Resume Upload
- [ ] Phase 1 — Week 3–4: Interview Loop + AI Integration + Score Report
- [ ] Phase 1 — Week 5–6: Payments + Free Tool + Referral + Landing Page
- [x] Phase 2 — Week 7–8: Pro Tier + Blurred Preview + Annual Plans
- [x] Phase 2 — Week 9–10: Email + ATS Tool + Analytics
- [x] Phase 3 — Week 11–12: Voice Mode + STAR Tool + Replay
- [x] Phase 3 — Week 13–14: Domain Packs + PDF Export + SEO
- [x] Phase 4 — Week 15–16: Campus Dashboard + B2B
- [x] Phase 4 — Week 17–20: Scale + Load Testing

**CURRENT PHASE:** Phase 4 complete. All phases shipped.

---

## ACTIVE A/B TESTS

| Flag | Control | Variant | Goal | Status |
|------|---------|---------|------|--------|
| `first_interview_questions` | 6 questions | 4 questions | Test if fewer Qs improve completion rate | ACTIVE — review at Phase 3 Week 12 |

Note: `first_interview_questions = 4` is an approved deviation from the "first interview = 6 questions" rule in this file. Client code clamps count to \[4, 10\]; optional env override: `NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS`.

---

## ENV VARIABLES REQUIRED (Always scaffold these)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Resend
RESEND_API_KEY=

# Upstash Redis (rate limiting + question cache)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Mistral AI (evaluation fallback — D3)
MISTRAL_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
# Optional — first-interview question count (integer, clamped 4–10 client-side). Default 6 when unset.
# NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS=4
NODE_ENV=
```

---

## SESSION START CHECKLIST

Before writing any code in a new session, confirm:
1. ✅ What phase and week are we in?
2. ✅ What was completed in the last session?
3. ✅ What is the single deliverable for THIS session?
4. ✅ Are there any blockers or decisions pending?

---

*This CLAUDE.md is the single source of truth. If any instruction conflicts with this file, this file wins.*

---

## DEVELOPMENT COMMANDS

```bash
npm run dev          # Start dev server with Turbopack (fast HMR)
npm run dev:fresh    # Clean .next cache then start dev server
npm run dev:webpack  # Start with Webpack (use if Turbopack causes issues)
npm run build        # Production build (Webpack — matches Vercel default `npm run build`)
npm run lint         # Run ESLint
npm run verify:pdf   # Regression: extractText on tests/fixtures/pdf (CI)
```

TypeScript type-checking is the primary correctness tool. **PDF parsing** is additionally covered by `verify:pdf`.

## PDF parsing (production operations)

- Implementation: `src/lib/pdf/parser.ts` (pdfjs-dist + `pdf-parse` fallback); requires **Node >=20.18.1** (aligned with `engines` in package.json and `pdfjs-dist` upstream).
- **Vercel logs:** filter **`[pdf-parse][diag]`**, **`[pdf-parse][attempt]`**, **`[pdf-parse][vercel]`**. Correlate **`x-vercel-id`** from the browser request with the deployment **Git SHA** and **Node version** shown in logs.
- If parser breaks after dependency or lockfile changes: **Redeploy with “Clear build cache”** once, then redeploy normally.
- **Dependabot branches in “Active branches”**: Vercel builds **Preview** deployments for each Git branch; Dependabot branches stay visible until merged/closed. They do **not** update Production unless the production branch tracked by the project advances. Optionally set **Ignored Build Step** for `dependabot/**` to skip Preview noise.

### PDF fixtures

- Checked-in fixtures: `tests/fixtures/pdf/*.pdf` — regenerate locally with  
  `npx tsx scripts/generate-pdf-fixtures.tsx` if text content needs to change (do **not** hand-edit binaries).

---

## ROUTE ARCHITECTURE

Three Next.js App Router route groups:

- `(auth)` — unauthenticated: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `(dashboard)` — authenticated app: `/dashboard`, `/onboarding/*`, `/interview/*`, `/report/*`, `/upgrade`, `/settings`, `/history`, `/analytics`, `/feedback`
- `(marketing)` — public pages: `/`, `/pricing`, `/campus`, `/about`, `/blog/*`, `/tools/*`

`admin/` is a flat ungrouped route for campus B2B admin pages.

---

## SUPABASE CLIENT PATTERNS

Four distinct clients — use the right one per context:

| File | When to use |
|------|------------|
| `src/lib/supabase/client.ts` | Browser components (`createBrowserClient`) |
| `src/lib/supabase/server.ts` — `createClient()` | Server components + API routes, auth-scoped queries |
| `src/lib/supabase/server.ts` — `createServiceClient()` | API routes that must bypass RLS (write on behalf of any user) |
| `src/lib/supabase/middleware.ts` | `middleware.ts` only — session refresh |

Use `createServiceClient()` in API routes when writing after credit deduction or creating records for a user.

---

## TWO INTERVIEW SESSION FLOWS

There are two distinct interview UIs — do not conflate them:

1. **Avatar session** (`/interview/session/[id]`) — the primary user-facing flow. Full avatar video + Web Speech API TTS + real-time captions + filler word detection. Phase state machine: `loading → avatar_speaking → candidate_answering → submitting → feedback → completed`. Key hooks: `useAvatarSync`, `useTimer`, `useSpeechRecognition`.

2. **Classic session** (`/interview/[id]`) — text-based fallback flow. `InterviewSession.tsx` owns state. No avatar, no TTS.

Both flows POST to the same API routes: `/api/interview/answer` and `/api/interview/complete`.

---

## AI PROVIDER ROUTING

Despite the "GPT-4o-mini only" rule above, a Mistral fallback exists at `src/lib/mistral/client.ts`. It activates when OpenAI throws `QuotaExhaustedError` (triggered by `insufficient_quota` from the OpenAI API). The circuit breaker in `src/lib/openai/client.ts` emits this error; callers in `evaluate-answer.ts` catch it and fall through to Mistral. This is the approved D3 fallback referenced by `MISTRAL_API_KEY` in the env vars.

---

## CREDIT DEDUCTION PATTERN

Credits are deducted via a Supabase RPC (not a direct UPDATE) to prevent race conditions. Helper: `checkAndDeductCredit(userId)` in `src/lib/utils/credits.ts`. On any downstream failure after deduction (interview creation, question generation), call `refundCredit(userId)`. Never UPDATE `credits_remaining` directly from application code.

---

## QUESTION CACHING

Generated questions are cached in Upstash Redis (`src/lib/redis/question-cache.ts`). Cache key is derived from role + difficulty + parsed resume. On cache hit, questions are shuffled and a subset is taken per `questionCount`. Cache writes are fire-and-forget (`void setCachedQuestions(...)`).

---

## ONBOARDING STATE

Multi-step onboarding state is in a React Context, not the URL or database. Provider: `OnboardingProvider` in `src/lib/onboarding/store.ts`, mounted at `src/app/(dashboard)/onboarding/layout.tsx`. State is lost on hard refresh — intentional, users restart from step 1.

---

## THEME SYSTEM

Theme (`light` | `dark`) is stored in `localStorage` under key `ie-theme`. A blocking inline `<script>` in `src/app/layout.tsx` reads this before React hydrates to prevent flash of wrong theme. The `data-theme` attribute on `<html>` is the CSS cascade hook. Use CSS variable tokens (not Tailwind `dark:` utilities) for new components.

---

## AVATAR INTERVIEW SYSTEM (New Feature — InterviewIQ Upgrade)

### Avatar Config
- Female avatar: Priya (Senior Recruiter) — /public/avatars/female/female-ai.mp4
- Male avatar: Arjun (Technical Lead) — /public/avatars/male/male-ai.mp4
- Voice: Web Speech API SpeechSynthesis — female voice for Priya, male for Arjun
- Video: 8-second seamless loop — plays continuously while TTS speaks
- Lip-sync illusion: video loop + simultaneous TTS audio

### Interview Flow — 4 Steps
- Step 1: Onboarding (goal + role + experience + resume upload)
- Step 2: Avatar Selection + Pre-interview briefing
- Step 3: Live Interview Session (avatar video + TTS + captions + timer + mic)
- Step 4: Report (scores + filler word analysis + speech patterns)

### Filler Word Rules
- Detection: post-answer only (never real-time during answer)
- Safe threshold: ≤3 per minute (green)
- Warning: 4–6 per minute (amber)
- Severe: 7+ per minute (red)
- Feedback: 1–1.5 lines max, motivational tone

### Timer Rules
- Timer starts: 0.5s AFTER TTS completes (not simultaneously)
- Timer stops: when candidate clicks Submit or time runs out
- Default time per question: 60 seconds
- No timer during avatar speaking

### Caption Rules
- Avatar captions: word-by-word highlight as TTS speaks
- Candidate transcript: real-time interim results from Web Speech API
- Both visible simultaneously in split layout

### Theme System
- CSS variables driven (tokens.ts)
- Default: system preference (prefers-color-scheme)
- Toggle: navbar top-right sun/moon icon
- Light mode bg: #F8FAFC (never pure white)
- Transition: 200ms ease on all color properties
