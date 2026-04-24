# 🚀 INTERVIEWERA — MASTER PROMPT SYSTEM
### For Claude / GPT-4o / Any Advanced LLM
**PRD Version:** 2.0 | **Date:** March 31, 2026 | **Status:** Ready for Development

---

# PART 1: CLAUDE.md — RULES & CONTEXT ANCHOR
## (Paste this at the START of EVERY new conversation)

```markdown
# CLAUDE.md — InterviewEra Project Rules & Context

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
| Analytics     | PostHog                        | Self-hosted not required for MVP     |
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
-- Core Tables
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
- [ ] Phase 2 — Week 7–8: Pro Tier + Blurred Preview + Annual Plans
- [ ] Phase 2 — Week 9–10: Email + ATS Tool + Analytics
- [ ] Phase 3 — Week 11–12: Voice Mode + STAR Tool + Replay
- [ ] Phase 3 — Week 13–14: Domain Packs + PDF Export + SEO
- [ ] Phase 4 — Week 15–16: Campus Dashboard + B2B
- [ ] Phase 4 — Week 17–20: Scale + Load Testing

**CURRENT PHASE:** [UPDATE THIS LINE MANUALLY BEFORE EACH SESSION]

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

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# App
NEXT_PUBLIC_APP_URL=
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
```

---

# PART 2: HLD — HIGH LEVEL DESIGN

```markdown
## InterviewEra — High Level Design (HLD)

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│   Next.js 14 App Router │ Tailwind + shadcn/ui │ TypeScript     │
│   Landing Page │ Auth │ Dashboard │ Interview UI │ Score Report  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                      API LAYER (Next.js)                         │
│  /api/resume/upload    →  Resume parsing pipeline               │
│  /api/interview/start  →  Question generation (from parsed JSON) │
│  /api/interview/answer →  Per-answer AI evaluation              │
│  /api/report/generate  →  Aggregate score + radar data           │
│  /api/credits/check    →  Credit balance verification           │
│  /api/payments/webhook →  Razorpay webhook handler              │
│  /api/referral/apply   →  Referral credit granting              │
└──────┬──────────────────────┬──────────────────┬───────────────┘
       │                      │                  │
┌──────▼──────┐   ┌───────────▼────┐   ┌────────▼──────────────┐
│  Supabase   │   │  OpenAI API    │   │  External Services    │
│  PostgreSQL │   │  GPT-4o-mini   │   │  Razorpay (payments)  │
│  Auth       │   │                │   │  Resend (email)       │
│  Storage    │   │  3 Operations: │   │  PostHog (analytics)  │
│  RLS        │   │  1. Parse PDF  │   │  Vercel (hosting)     │
└─────────────┘   │  2. Gen Qs    │   └───────────────────────┘
                  │  3. Eval Ans  │
                  └───────────────┘
```

### Key Design Decisions

#### 1. Decoupled Resume Parsing (CRITICAL)
```
Upload Time:   PDF → pdf-parse → raw text → GPT-4o-mini → JSON stored in DB
Interview Time: Read JSON from DB → Generate questions (NO re-parsing)
Time saved:    ~13 seconds per interview start
```

#### 2. Credit System Flow
```
User starts interview → Check credits_remaining > 0 → 
Deduct 1 credit → Create interview record → 
Generate questions from cached resume JSON → 
Interview begins (< 4 seconds total)
```

#### 3. Score Report Visibility Gates
```
Free User:  See score + radar + per-Q score + 1-line feedback
            Detailed Analysis → CSS blur + "Upgrade" overlay
Starter:    Above + Full detailed suggestions (no blur)
            Model answers → Still blurred  
Pro:        Everything visible + PDF export + Replay
```

#### 4. Viral Loop Architecture
```
Interview Complete → Generate Share Card (score + role + branding) →
User shares to WhatsApp/Instagram → Friend clicks referral link →
Friend signs up → Friend completes first interview →
Both users get +1 credit
```

### Data Flow Diagrams

#### Resume Upload Flow
```
User → Upload PDF → Supabase Storage (file_url saved)
     → pdf-parse extracts raw text → stored in resume.raw_text
     → GPT-4o-mini structures JSON → stored in resume.parsed_data
     → Status updated: "parsed" → User sees confirmation
     → User proceeds to interview
```

#### Interview Session Flow  
```
User clicks "Start Interview" →
  → credits check (deduct 1) →
  → Read resume.parsed_data from DB →
  → GPT-4o-mini generates 6 questions with rubrics →
  → Questions stored in DB (questions table) →
  → User answers Q1 → Answer stored → AI evaluates → Score stored →
  → Repeat for Q2–Q6 →
  → Report aggregated → Radar data calculated →
  → Score report displayed
```

### Performance Targets
| Operation               | Target    | Alert Threshold |
|-------------------------|-----------|-----------------|
| Resume parse (total)    | < 8s      | > 12s           |
| Interview start         | < 4s      | > 6s            |
| Per-answer evaluation   | < 3s (p95)| > 8s            |
| Score report generation | < 5s      | > 10s           |
| Payment success rate    | > 92%     | < 85%           |
| Resume parse success    | > 95%     | < 90%           |
```

---

# PART 3: LLD — LOW LEVEL DESIGN

```markdown
## InterviewEra — Low Level Design (LLD)

### File & Folder Structure

```
interviewera/
├── CLAUDE.md                    ← Project rules (always open first)
├── .env.local                   ← All secrets (never commit)
├── .env.example                 ← Template (commit this)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── app/                         ← Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           ← Authenticated layout
│   │   ├── dashboard/page.tsx   ← Main dashboard
│   │   ├── interview/
│   │   │   ├── [id]/page.tsx    ← Active interview session
│   │   │   └── new/page.tsx     ← Start new interview
│   │   ├── report/
│   │   │   └── [id]/page.tsx    ← Score report page
│   │   └── settings/page.tsx
│   ├── (marketing)/
│   │   ├── page.tsx             ← Landing page (above-fold = resume upload)
│   │   ├── campus/page.tsx      ← B2B landing page
│   │   └── tools/
│   │       └── question-generator/page.tsx  ← Free tool #1
│   └── api/
│       ├── resume/
│       │   └── upload/route.ts
│       ├── interview/
│       │   ├── start/route.ts
│       │   ├── answer/route.ts
│       │   └── complete/route.ts
│       ├── report/
│       │   └── generate/route.ts
│       ├── payments/
│       │   ├── create-order/route.ts
│       │   └── webhook/route.ts
│       └── referral/
│           └── apply/route.ts
│
├── components/
│   ├── ui/                      ← shadcn/ui components (auto-generated)
│   ├── interview/
│   │   ├── QuestionCard.tsx
│   │   ├── AnswerInput.tsx
│   │   ├── ProgressBar.tsx
│   │   └── MidInterviewNudge.tsx
│   ├── report/
│   │   ├── RadarChart.tsx       ← recharts radar component
│   │   ├── ScoreCard.tsx
│   │   ├── QuestionFeedback.tsx
│   │   ├── BlurredSection.tsx   ← Upgrade gate component
│   │   └── ShareCard.tsx        ← WhatsApp share image
│   ├── resume/
│   │   ├── UploadZone.tsx
│   │   └── ParseStatus.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── CreditBadge.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            ← Browser client
│   │   ├── server.ts            ← Server client (with service role)
│   │   └── middleware.ts        ← Auth middleware
│   ├── openai/
│   │   ├── client.ts            ← OpenAI client with retry logic
│   │   ├── parse-resume.ts      ← Resume parsing prompt
│   │   ├── generate-questions.ts← Question generation prompt
│   │   └── evaluate-answer.ts   ← Answer evaluation prompt
│   ├── razorpay/
│   │   ├── client.ts
│   │   └── webhook-verify.ts
│   ├── utils/
│   │   ├── credits.ts           ← Credit check/deduct helpers
│   │   ├── report.ts            ← Report aggregation logic
│   │   └── share-card.ts        ← Share card generation (canvas/html2canvas)
│   └── validations/
│       └── schemas.ts           ← Zod schemas for all API inputs
│
├── hooks/
│   ├── useInterview.ts
│   ├── useCredits.ts
│   └── useReport.ts
│
├── types/
│   ├── database.types.ts        ← Auto-generated from Supabase
│   └── app.types.ts             ← Application-level types
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
│
└── docs/
    ├── HLD.md
    ├── LLD.md
    └── API.md
```

### Critical Component Specifications

#### BlurredSection.tsx (Upgrade Gate)
```tsx
// Props: tier, featureType, children
// If user's plan < required tier: show blurred children + upgrade CTA overlay
// Never expose the actual content in DOM (use server-side tier check, not CSS-only)
```

#### OpenAI Client with Retry Logic
```typescript
// lib/openai/client.ts
// Implements: exponential backoff (1s → 2s → 4s)
// Max retries: 3
// On 429: wait + retry
// On 5xx: retry
// On all retries exhausted: throw OpenAIUnavailableError
// Circuit breaker: track failure rate, open circuit after 5 consecutive failures
```

#### Credit System
```typescript
// lib/utils/credits.ts
// checkAndDeductCredit(userId): 
//   - Read credits_remaining from users table
//   - If 0: return { success: false, reason: 'no_credits' }
//   - If > 0: deduct 1 using DB transaction + log to credit_transactions
//   - Return { success: true, remaining: newCount }
// CRITICAL: Use DB transaction to prevent race conditions
```

### API Contract Specifications

#### POST /api/resume/upload
```typescript
// Input: FormData { file: File (PDF/DOCX/TXT, max 5MB), userId: string }
// Process: upload to Supabase Storage → extract text → GPT parse → store JSON
// Output: { resumeId: string, status: 'parsed' | 'failed', parsedSummary: {...} }
// Error: 400 (invalid file), 413 (too large), 500 (parse failed)
// SLA: Complete in < 8 seconds
```

#### POST /api/interview/start
```typescript
// Input: { resumeId: string, role: string, difficulty: 'easy'|'medium'|'hard' }
// Auth: Required (check credits first)
// Process: read parsed_data → deduct 1 credit → generate 6 questions → store
// Output: { interviewId: string, questions: Question[], creditsRemaining: number }
// Error: 402 (no credits), 404 (resume not found), 500 (generation failed)
// SLA: Complete in < 4 seconds
```

#### POST /api/interview/answer
```typescript
// Input: { questionId: string, answerText: string, interviewId: string }
// Process: evaluate against rubric → store evaluation → return score
// Output: { evaluationId: string, score: number, feedback: string }
// Error: 404 (question not found), 500 (eval failed)
// SLA: Complete in < 3 seconds (p95)
```

### Database Migrations (Supabase SQL)

#### Migration 001: Initial Schema
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUM types
create type plan_tier as enum ('free', 'starter', 'pro', 'campus');
create type interview_status as enum ('pending', 'in_progress', 'completed', 'abandoned');
create type resume_status as enum ('uploading', 'parsing', 'parsed', 'failed');
create type answer_mode as enum ('text', 'voice');
create type credit_type as enum ('debit', 'credit');
create type referral_status as enum ('pending', 'completed', 'credited');

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) primary key,
  email text not null,
  name text,
  plan_tier plan_tier default 'free',
  credits_remaining integer default 5,
  placement_date date,
  created_at timestamptz default now()
);

-- RLS: Users can only see their own row
alter table public.users enable row level security;
create policy "Users: own row only" on public.users
  for all using (auth.uid() = id);

-- Resumes table
create table public.resumes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  file_url text,
  raw_text text,
  parsed_data jsonb,
  status resume_status default 'uploading',
  created_at timestamptz default now()
);
create index on public.resumes using gin(parsed_data);
alter table public.resumes enable row level security;
create policy "Resumes: own only" on public.resumes
  for all using (auth.uid() = user_id);

-- Interviews table
create table public.interviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  resume_id uuid references public.resumes(id),
  role text not null,
  difficulty text default 'medium',
  question_count integer default 6,
  status interview_status default 'pending',
  started_at timestamptz,
  completed_at timestamptz
);
alter table public.interviews enable row level security;
create policy "Interviews: own only" on public.interviews
  for all using (auth.uid() = user_id);

-- Questions table
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade,
  order_index integer not null,
  question_text text not null,
  rubric jsonb,
  category text
);
alter table public.questions enable row level security;
create policy "Questions: interview owner only" on public.questions
  for all using (
    exists (select 1 from public.interviews i 
            where i.id = interview_id and i.user_id = auth.uid())
  );

-- Answers table
create table public.answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.questions(id) on delete cascade,
  answer_text text,
  answer_mode answer_mode default 'text',
  submitted_at timestamptz default now()
);
alter table public.answers enable row level security;
create policy "Answers: question owner only" on public.answers
  for all using (
    exists (
      select 1 from public.questions q
      join public.interviews i on i.id = q.interview_id
      where q.id = question_id and i.user_id = auth.uid()
    )
  );

-- Evaluations table
create table public.evaluations (
  id uuid default uuid_generate_v4() primary key,
  answer_id uuid references public.answers(id) on delete cascade,
  overall_score numeric(3,1),
  dimension_scores jsonb,
  feedback_text text,
  detailed_analysis jsonb
);
alter table public.evaluations enable row level security;
create policy "Evaluations: answer owner only" on public.evaluations
  for all using (
    exists (
      select 1 from public.answers a
      join public.questions q on q.id = a.question_id
      join public.interviews i on i.id = q.interview_id
      where a.id = answer_id and i.user_id = auth.uid()
    )
  );

-- Reports table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  interview_id uuid references public.interviews(id) on delete cascade,
  overall_score numeric(3,1),
  radar_data jsonb,
  trend_data jsonb,
  generated_at timestamptz default now()
);
alter table public.reports enable row level security;
create policy "Reports: interview owner only" on public.reports
  for all using (
    exists (select 1 from public.interviews i 
            where i.id = interview_id and i.user_id = auth.uid())
  );

-- Subscriptions table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  plan plan_tier not null,
  razorpay_sub_id text,
  status text default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz
);
alter table public.subscriptions enable row level security;
create policy "Subscriptions: own only" on public.subscriptions
  for all using (auth.uid() = user_id);

-- Referrals table
create table public.referrals (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references public.users(id),
  referred_id uuid references public.users(id),
  status referral_status default 'pending',
  credited_at timestamptz
);
alter table public.referrals enable row level security;
create policy "Referrals: own only" on public.referrals
  for all using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- Credit Transactions table (audit log)
create table public.credit_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type credit_type not null,
  amount integer not null,
  reason text,
  created_at timestamptz default now()
);
alter table public.credit_transactions enable row level security;
create policy "Credits: own only" on public.credit_transactions
  for all using (auth.uid() = user_id);
```
```

---

# PART 4: PHASE-WISE MASTER PROMPTS

---

## ═══════════════════════════════════════
## PROMPT 1: PROJECT BOOTSTRAP
## (Use this ONCE to initialize everything)
## ═══════════════════════════════════════

```
You are a senior full-stack engineer. Your task is to bootstrap the InterviewEra project 
from scratch. InterviewEra is an AI-powered mock interview SaaS for Indian students.

## CONTEXT (READ CAREFULLY BEFORE PROCEEDING)

Product: InterviewEra v2.0
PRD Date: March 31, 2026
Phase: Phase 1 — Project Initialization

## YOUR EXACT TASK LIST (Do all of these in sequence, skip nothing)

### STEP 1: Create CLAUDE.md
Create a file called CLAUDE.md in the project root. This file contains:
- Project identity and description
- Complete tech stack with exact versions
- Architecture principles (decoupled parsing, text-first, single AI provider)
- Pricing tiers (Free/Starter/Pro/Campus)
- Database schema (all 10 tables)
- All 3 AI prompt templates (resume parse, question gen, answer eval)
- Anti-hallucination rules
- ENV variables list
- Phase tracker checklist

### STEP 2: Scaffold Next.js Project
```bash
npx create-next-app@latest interviewera \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd interviewera
```

### STEP 3: Install All Dependencies
Install these packages (nothing else without approval):
```bash
# Core
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label textarea badge avatar 
npx shadcn-ui@latest add progress dialog sheet dropdown-menu
npm install recharts lucide-react

# AI
npm install openai

# PDF Parsing
npm install pdf-parse
npm install --save-dev @types/pdf-parse

# Payments
npm install razorpay

# Email
npm install resend

# Validation
npm install zod

# Analytics
npm install posthog-js
```

### STEP 4: Create Folder Structure
Create ALL these folders and placeholder files:
```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (dashboard)/layout.tsx
│   ├── (dashboard)/dashboard/page.tsx
│   ├── (dashboard)/interview/[id]/page.tsx
│   ├── (dashboard)/interview/new/page.tsx
│   ├── (dashboard)/report/[id]/page.tsx
│   ├── (marketing)/page.tsx
│   ├── (marketing)/campus/page.tsx
│   ├── (marketing)/tools/question-generator/page.tsx
│   └── api/
│       ├── resume/upload/route.ts
│       ├── interview/start/route.ts
│       ├── interview/answer/route.ts
│       ├── interview/complete/route.ts
│       ├── report/generate/route.ts
│       ├── payments/create-order/route.ts
│       ├── payments/webhook/route.ts
│       └── referral/apply/route.ts
├── components/
│   ├── interview/QuestionCard.tsx
│   ├── interview/AnswerInput.tsx
│   ├── interview/ProgressBar.tsx
│   ├── report/RadarChart.tsx
│   ├── report/ScoreCard.tsx
│   ├── report/BlurredSection.tsx
│   ├── report/ShareCard.tsx
│   ├── resume/UploadZone.tsx
│   └── layout/CreditBadge.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   ├── openai/client.ts
│   ├── openai/parse-resume.ts
│   ├── openai/generate-questions.ts
│   ├── openai/evaluate-answer.ts
│   ├── razorpay/client.ts
│   ├── utils/credits.ts
│   ├── utils/report.ts
│   └── validations/schemas.ts
├── hooks/
│   ├── useInterview.ts
│   └── useCredits.ts
└── types/
    └── app.types.ts
```

### STEP 5: Create .env.example
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### STEP 6: Configure next.config.js
Add: image domains for Supabase storage, env validation.

### STEP 7: Create TypeScript Types
In src/types/app.types.ts, define all TypeScript interfaces for:
PlanTier, InterviewStatus, ResumeStatus, User, Resume, Interview, 
Question, Answer, Evaluation, Report, Subscription, CreditTransaction

### STEP 8: Verify Project Runs
Run `npm run dev` and confirm no TypeScript errors.

## RULES FOR THIS TASK
- Do NOT implement any business logic yet — just scaffolding
- Every file must have proper TypeScript types (no `any`)
- Every component must be a proper React component (not just a div)
- CLAUDE.md must be complete and accurate — this is the project bible
- Do NOT install any package not listed in Step 3

## DELIVERABLE
At the end, provide:
1. Confirmation that CLAUDE.md is created with all sections
2. Full folder structure as a tree
3. Any setup instructions the developer needs to run
4. List of any decisions made that differ from spec (should be zero)
```

---

## ═══════════════════════════════════════
## PROMPT 2: PHASE 1 — WEEK 1-2
## Database + Auth + Resume Upload Pipeline
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 1 | Week: 1-2
Previous work: Project scaffolding complete (CLAUDE.md, folder structure, dependencies)
This session goal: Complete Database schema + Auth + Resume Upload Pipeline

Open CLAUDE.md first. Confirm you have read it. Then proceed.

## DELIVERABLES FOR THIS SESSION (implement in this exact order)

### DELIVERABLE 1: Supabase Database Migration
File: supabase/migrations/001_initial_schema.sql

Implement the COMPLETE schema from CLAUDE.md including:
- All 10 tables: users, resumes, interviews, questions, answers, 
  evaluations, reports, subscriptions, referrals, credit_transactions
- All ENUMs: plan_tier, interview_status, resume_status, answer_mode, 
  credit_type, referral_status
- RLS policies on EVERY table (users can only access their own data)
- GIN index on resumes.parsed_data (JSONB)
- All foreign keys with cascade deletes
- UUID primary keys using uuid_generate_v4()
- Default values: users.credits_remaining = 5, users.plan_tier = 'free'

VALIDATION RULES:
- Run each CREATE TABLE statement mentally. Verify column names match CLAUDE.md exactly.
- Every table MUST have: enable row level security + at least one policy
- Do NOT add columns not in CLAUDE.md schema

### DELIVERABLE 2: Supabase Client Configuration
Files to create:

**src/lib/supabase/client.ts** — Browser client
- Uses createBrowserClient from @supabase/ssr
- Typed with Database type (auto-generated)
- Singleton pattern to avoid multiple instances

**src/lib/supabase/server.ts** — Server client
- Uses createServerClient from @supabase/ssr  
- Reads cookies for session management
- Used in API routes and Server Components

**src/lib/supabase/middleware.ts** — Auth middleware
- Refreshes session on every request
- Redirects unauthenticated users away from /dashboard
- Redirects authenticated users away from /login and /signup
- Public routes: /, /login, /signup, /campus, /tools/*

### DELIVERABLE 3: Auth Pages

**src/app/(auth)/signup/page.tsx** — Signup page
Required fields: Full name, Email, Password (min 8 chars), Placement date (month/year dropdown)
- On submit: Supabase createUser → also insert row in public.users table
- Show loading state during submission
- Redirect to /dashboard on success
- Error handling: show specific error messages (email already exists, weak password)
- Design: Clean, minimal, centered card. No decorative elements.

**src/app/(auth)/login/page.tsx** — Login page
- Email + Password fields
- Google OAuth button (using Supabase OAuth)
- "Forgot password" link (placeholder for now)
- Redirect to /dashboard on success
- Link to signup page

### DELIVERABLE 4: Resume Upload Pipeline

This is the MOST CRITICAL architectural component. Implement carefully.

**src/lib/openai/client.ts** — OpenAI client
```typescript
// Must implement:
// - OpenAI instance with OPENAI_API_KEY from env
// - Exponential backoff wrapper: retryWithBackoff(fn, maxRetries=3)
//   Delays: 1000ms → 2000ms → 4000ms
//   Retry on: status 429, 500, 502, 503, 504
//   After all retries: throw new OpenAIUnavailableError('AI temporarily unavailable')
// - Circuit breaker: track consecutive failures, open after 5
```

**src/lib/openai/parse-resume.ts** — Resume parsing
```typescript
// Function: parseResume(rawText: string): Promise<ParsedResume>
// Uses EXACT prompt template from CLAUDE.md (Template 1)
// Validates output is valid JSON before returning
// If JSON invalid: retry once, then throw ParseError
// Type: ParsedResume = { name, email, phone, skills[], experience[], projects[], education[], target_roles[] }
```

**src/app/api/resume/upload/route.ts** — Upload API
```typescript
// POST handler
// Steps IN ORDER:
// 1. Authenticate user (check session)
// 2. Validate file: must be PDF/DOCX/TXT, max 5MB
// 3. Upload raw file to Supabase Storage: resumes/{userId}/{timestamp}.pdf
// 4. Create resume record: { user_id, file_url, status: 'parsing' }
// 5. Extract text: use pdf-parse for PDF, read directly for TXT
// 6. Store raw_text in resume record
// 7. Call parseResume(rawText) — uses OpenAI
// 8. Store parsed_data JSON in resume record
// 9. Update status to 'parsed' (or 'failed' if error)
// 10. Return: { resumeId, status, parsedSummary: { name, skills[], role } }
//
// Error handling:
// - File too large: 413 response
// - Invalid type: 400 response  
// - Parse failed: still return resumeId with status 'failed', show manual input option
// - Total SLA: must complete in < 8 seconds
```

**src/components/resume/UploadZone.tsx** — Upload UI
- Drag-and-drop zone + click-to-browse
- Accept: .pdf, .docx, .txt only
- Show file name and size after selection
- Upload progress: "Uploading..." → "Extracting text..." → "AI parsing resume..." → "Done!"
- Success state: show parsed name + skills count
- Error state: "Parsing failed. Enter details manually" with manual input form fallback
- Use shadcn Progress component for loading states

**src/app/(dashboard)/dashboard/page.tsx** — Dashboard skeleton
- Show: User name, credits remaining (CreditBadge component)
- Show: Resume upload zone (if no resume) OR resume parsed summary (if uploaded)
- Show: "Start Interview" button (disabled if no resume parsed)
- Show: Previous interviews list (empty state for now)
- DO NOT implement navigation to interview yet — just the dashboard layout

### DELIVERABLE 5: CreditBadge Component
**src/components/layout/CreditBadge.tsx**
- Shows: "5 credits remaining" with a chip/badge
- Color: green > 3 credits, yellow 1-2 credits, red 0 credits
- On click: shows tooltip "Each interview uses 1 credit"
- Used in dashboard header and sidebar

## TECHNICAL CONSTRAINTS
- All API routes must validate inputs with Zod schemas
- All Supabase queries must use typed client (no raw SQL in API routes)
- No console.log in production code — use proper error logging
- All async functions must have try/catch with proper error types
- TypeScript strict mode — no `any`, no `as any`

## TESTING CHECKLIST
Before marking this session complete, verify:
- [ ] Migration SQL runs without errors in Supabase
- [ ] Signup creates a user in both auth.users and public.users
- [ ] Login redirects to /dashboard
- [ ] Unauthenticated access to /dashboard redirects to /login
- [ ] PDF upload creates resume record with status 'parsed'
- [ ] Parsed data contains: name, skills array, experience array
- [ ] Parse completes in < 8 seconds on a typical 1-page PDF
- [ ] Credits badge shows "5 credits remaining" for new user
- [ ] File validation rejects files > 5MB and non-PDF/DOCX/TXT

## OUTPUT FORMAT
Provide complete, copy-paste-ready code for each file. 
After each file, state: "File complete. Moving to next."
End with a summary of: files created, any deviations from spec, next steps.
```

---

## ═══════════════════════════════════════
## PROMPT 3: PHASE 1 — WEEK 3-4
## Interview Loop + AI Integration + Score Report
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 1 | Week: 3-4
Completed in previous sessions:
  ✅ Project scaffolding + CLAUDE.md
  ✅ Database schema + RLS policies (supabase/migrations/001_initial_schema.sql)
  ✅ Supabase client configuration (client.ts, server.ts, middleware.ts)
  ✅ Auth pages (login, signup) with Supabase Auth
  ✅ Resume upload pipeline (upload zone → pdf-parse → GPT-4o-mini → stored JSON)
  ✅ Dashboard skeleton with CreditBadge

This session goal: Build complete interview loop (start → answer → evaluate → report)

Open CLAUDE.md and confirm you've read it. Then proceed.

## DELIVERABLES FOR THIS SESSION

### DELIVERABLE 1: Question Generation

**src/lib/openai/generate-questions.ts**
```typescript
// Function: generateQuestions(params: GenerateQuestionsParams): Promise<Question[]>
// Input: { parsedResume: ParsedResume, role: string, difficulty: string, count: number }
// Uses EXACT prompt Template 2 from CLAUDE.md
// Validates output: must be valid JSON with questions array
// Each question must have: order, question_text, category, rubric
// Rubric must have: ideal_keywords[], ideal_structure, red_flags[]
// If count not specified: default to 6 (FIRST INTERVIEW RULE)
// Error: throw QuestionGenerationError if GPT fails after retries
```

**src/app/api/interview/start/route.ts**
```typescript
// POST handler
// Input: { resumeId: string, role: string, difficulty: 'easy'|'medium'|'hard' }
// Steps IN ORDER:
// 1. Authenticate user
// 2. Fetch resume.parsed_data from DB (verify user owns it)
// 3. Check and deduct 1 credit (use credits.ts utility)
//    - If 0 credits: return 402 with { error: 'no_credits', upgradeUrl: '/pricing' }
// 4. Create interview record { user_id, resume_id, role, difficulty, status: 'in_progress', started_at }
// 5. Generate 6 questions using generateQuestions()
// 6. Insert all 6 questions into questions table
// 7. Update interview.question_count = 6
// 8. Return: { interviewId, questions: [...], creditsRemaining: number }
// SLA: Must complete in < 4 seconds
// Error handling: If question generation fails, refund the credit, delete interview record
```

**src/lib/utils/credits.ts**
```typescript
// Function: checkAndDeductCredit(userId: string): Promise<CreditResult>
// CreditResult = { success: boolean; remaining: number; reason?: 'no_credits' }
// CRITICAL: Use Supabase RPC or transaction to prevent race conditions
// Steps:
//   BEGIN transaction
//   SELECT credits_remaining FOR UPDATE (lock row)
//   IF credits_remaining <= 0: ROLLBACK, return { success: false, reason: 'no_credits' }
//   UPDATE users SET credits_remaining = credits_remaining - 1
//   INSERT into credit_transactions { user_id, type: 'debit', amount: 1, reason: 'interview_start' }
//   COMMIT
//   Return { success: true, remaining: newCount }

// Function: addCredit(userId: string, amount: number, reason: string): Promise<void>
// Used for: referral bonuses, manual credits
// Same transaction pattern
```

### DELIVERABLE 2: Interview Session UI

**src/app/(dashboard)/interview/new/page.tsx** — "Start Interview" configuration
- Input: Role (text input with suggestions: "Software Engineer", "Product Manager", "Data Analyst", "Backend Developer", "Full Stack Developer")
- Input: Difficulty (radio: Easy / Medium / Hard)
- Show: Credits remaining warning if <= 1
- Show: "Your resume: [parsed name] — [N skills detected]"
- Button: "Start Interview (uses 1 credit)"
- On click: POST to /api/interview/start → redirect to /interview/[id]

**src/app/(dashboard)/interview/[id]/page.tsx** — Active interview session
This is the core interview experience. Implement carefully.

State machine:
```
loading → question_display → answering → submitting → 
next_question → ... → all_answered → generating_report → report
```

UI Layout:
- Top: Progress bar "Question 3 of 6 — Almost there!" 
- Center: Question card with question text and category badge
- Bottom: Text area for answer (min 100 characters encouraged)
- Button: "Submit Answer" (disabled while submitting)

Behavior:
- Questions loaded from initial API response (no additional fetching per question)
- On submit answer: POST to /api/interview/answer with questionId + answerText
  - Show loading: "AI is evaluating your answer..."
  - Store evaluation result locally (show after interview completes, not per question)
- At question 4 of 6: show nudge toast "2 more to go — your score report is almost ready!"
- After last answer submitted: auto-redirect to /report/[interviewId] 
- NO back button during interview
- NO ability to edit submitted answers

**src/components/interview/QuestionCard.tsx**
- Props: question (Question type), questionNumber, totalQuestions
- Display: Category badge (Technical/Behavioral/Situational with different colors)
- Display: Question text in large, readable font
- Animate in on each new question (simple fade)

**src/components/interview/ProgressBar.tsx**
- Props: current, total
- Visual: filled segments (not a smooth bar — individual blocks per question)
- Text: "Question {current} of {total}"
- Color: green for completed, blue for current, gray for upcoming

**src/components/interview/AnswerInput.tsx**
- Props: onSubmit, isSubmitting, minChars=50
- Textarea with character count
- Hint text: "Think about specific examples from your experience"
- Disabled state: shows spinner when isSubmitting
- Submit button text: "Submit Answer →" (or "Submitting..." when loading)

### DELIVERABLE 3: Answer Evaluation

**src/lib/openai/evaluate-answer.ts**
```typescript
// Function: evaluateAnswer(params: EvaluateParams): Promise<Evaluation>
// Input: { question: string, rubric: Rubric, answerText: string }
// Uses EXACT prompt Template 3 from CLAUDE.md
// Must return:
//   overall_score: weighted average (Communication 20%, Technical 25%, Structure 20%, Confidence 15%, Relevance 20%)
//   dimension_scores: { communication_clarity, technical_depth, answer_structure, confidence, relevance }
//   feedback_text: 2-3 actionable sentences
//   detailed_analysis: { strengths[], improvements[], model_answer_hint, keywords_missing[] }
// STRICT scoring: prompt must say "Do not inflate scores. 7+ means genuinely excellent."
// Validate: all scores must be 1–10, overall must be weighted average (verify math)
```

**src/app/api/interview/answer/route.ts**
```typescript
// POST handler
// Input: { questionId, answerText, interviewId }
// Steps:
// 1. Authenticate user, verify interview ownership
// 2. Fetch question + rubric from DB
// 3. Create answer record { question_id, answer_text, answer_mode: 'text' }
// 4. Call evaluateAnswer()
// 5. Store evaluation in evaluations table
// 6. Return { evaluationId, score: overall_score, feedback: feedback_text }
// SLA: < 3 seconds p95
// If AI fails: return { evaluationId: null, score: null, feedback: 'Unable to evaluate this answer.' }
// Still store the answer even if evaluation fails
```

**src/app/api/interview/complete/route.ts**
```typescript
// POST handler  
// Input: { interviewId }
// Steps:
// 1. Authenticate + verify ownership
// 2. Update interview status to 'completed', set completed_at
// 3. Trigger report generation (call generate-report logic)
// 4. Return { reportId }
```

### DELIVERABLE 4: Score Report

**src/app/api/report/generate/route.ts**
```typescript
// POST handler
// Input: { interviewId }
// Steps:
// 1. Fetch all questions for interview
// 2. Fetch all answers for each question
// 3. Fetch all evaluations for each answer
// 4. Calculate: overall_score = average of all evaluation.overall_scores
// 5. Calculate radar_data:
//    { 
//      communication: avg of all communication_clarity scores,
//      technical: avg of all technical_depth scores,
//      structure: avg of all answer_structure scores,
//      confidence: avg of all confidence scores,
//      relevance: avg of all relevance scores
//    }
// 6. Fetch trend_data: last 5 reports for this user (for score trend chart)
// 7. Insert into reports table
// 8. Return { reportId, overallScore, radarData, trendData }
```

**src/app/(dashboard)/report/[id]/page.tsx** — Score Report Page
Layout (top to bottom):
1. Header: "Interview Complete — [Role] — [Date]"
2. Overall Score: Big number (6.4/10) with color coding (red<5, yellow 5-7, green>7)
3. RadarChart component (5 dimensions)
4. Per-question breakdown: each question + answer + one-line feedback + score chip
5. BlurredSection: "Detailed Analysis" (blurred for Free/Starter, visible for Pro)
6. BlurredSection: "Model Answer Comparisons" (blurred for Free/Starter/Pro 3→Pro)
7. Trend chart (if >= 2 interviews completed, else show "Complete more interviews to see trend")
8. CTAs: "Practice Again (X credits left)" | "Share Score" | Upgrade CTA (if applicable)

**src/components/report/RadarChart.tsx**
- Uses recharts RadarChart component
- 5 axes: Communication, Technical, Structure, Confidence, Relevance
- Show score value on each point
- Color: semi-transparent blue fill, solid blue border
- Responsive (works on mobile)

**src/components/report/BlurredSection.tsx**
```typescript
// Props: isVisible: boolean, requiredPlan: PlanTier, children: ReactNode
// If isVisible: render children normally
// If !isVisible: 
//   - Render children with CSS blur filter (filter: blur(6px))
//   - ALSO render an overlay with: lock icon + "Upgrade to [Plan] to unlock" + upgrade button
//   - NOTE: blurred content must not be copy-pasteable (use CSS user-select: none)
//   - Server-side: detailed_analysis content only sent if user has correct tier
```

## TESTING CHECKLIST
- [ ] Interview starts in < 4 seconds after clicking "Start Interview"
- [ ] Credit deducted immediately on interview start
- [ ] 6 questions generated, all relevant to user's role and resume
- [ ] Each answer submission returns in < 3 seconds
- [ ] Progress bar updates correctly (1→2→3→4→5→6)
- [ ] Nudge toast appears at question 4
- [ ] Score report shows overall score 1–10
- [ ] Radar chart renders with all 5 dimensions
- [ ] BlurredSection is blurred for free users (verify content not readable)
- [ ] "Practice Again" button shows remaining credits correctly
- [ ] Score report generates in < 5 seconds after last answer

## OUTPUT FORMAT
Provide complete code for each file. State "File complete" after each.
Flag any assumption made. End with testing checklist confirmation.
```

---

## ═══════════════════════════════════════
## PROMPT 4: PHASE 1 — WEEK 5-6
## Payments + Free Tool + Viral Growth Features
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 1 | Week: 5-6
Completed in previous sessions:
  ✅ Project scaffolding + CLAUDE.md
  ✅ Database + Auth + Resume Upload Pipeline
  ✅ Interview Loop (start → answer → evaluate)
  ✅ Score Report with RadarChart + BlurredSection

This session goal: Razorpay (Starter plan) + Interview Question Generator tool + 
                  Score Share Card + Referral System + Campus Landing Page + 
                  Main Landing Page

Open CLAUDE.md first. Confirm you've read it.

## DELIVERABLES FOR THIS SESSION

### DELIVERABLE 1: Razorpay Integration (Starter Plan Only)

**src/lib/razorpay/client.ts**
- Initialize Razorpay with server-side key (never expose secret on client)
- Function: createSubscriptionOrder(userId, plan: 'starter')
- Function: verifyWebhookSignature(body, signature)

**src/app/api/payments/create-order/route.ts**
```typescript
// POST — Create Razorpay subscription order
// Input: { plan: 'starter' }  (Pro tier added in Phase 2)
// Plan prices: starter = ₹9900 (in paise), pro = ₹24900
// Steps:
// 1. Authenticate user
// 2. Check user doesn't already have active subscription
// 3. Create Razorpay subscription (NOT one-time order) with:
//    - plan_id: from Razorpay dashboard (configured separately)
//    - customer_notify: 1
//    - total_count: 12 (12 months max, then auto-renew)
// 4. Return { subscriptionId, amount, currency: 'INR', key: NEXT_PUBLIC_RAZORPAY_KEY_ID }
```

**src/app/api/payments/webhook/route.ts**
```typescript
// POST — Razorpay webhook handler
// Events to handle:
//   subscription.activated → update user plan_tier, credits, create subscription record
//   subscription.charged   → top up monthly credits (Starter: +12, Pro: +30)
//   subscription.cancelled → downgrade to free at period end
//   payment.failed         → log, send email via Resend
// 
// CRITICAL SECURITY: verify webhook signature before processing
// CRITICAL: use idempotency check (store razorpay_payment_id in DB to prevent duplicate processing)
// Return 200 immediately, process async
```

**Pricing Page / Upgrade Modal**
Create src/app/(dashboard)/upgrade/page.tsx:
- Show Free vs Starter (₹99/mo) vs Pro (₹249/mo) — Pro grayed out "Coming Soon"
- Starter features checklist
- "Subscribe to Starter" button → calls /api/payments/create-order → opens Razorpay checkout
- After payment: redirect to /dashboard with success toast "You're now on Starter! 12 credits added."

**Razorpay Checkout Integration (Client-Side)**
```typescript
// Load Razorpay script dynamically: https://checkout.razorpay.com/v1/checkout.js
// Open checkout with: key, subscription_id, name: "InterviewEra", 
//   description: "Starter Plan - ₹99/month"
// On success: POST to /api/payments/verify → show success
// On dismiss: show "Payment cancelled" toast
```

### DELIVERABLE 2: Free Tool — Interview Question Generator

**src/app/(marketing)/tools/question-generator/page.tsx**
This is the primary SEO traffic page. Build it properly.

UI:
- Heading: "Free Interview Question Generator"  
- Sub: "Get role-specific interview questions in 10 seconds — no signup required"
- Form: Role input (text, with common role suggestions dropdown)
- Form: Experience level (Fresher / 1-3 years / 3+ years)
- Form: Domain (General / Software Engineering / Product Management / Data Science / Marketing)
- Button: "Generate Questions →"
- Output: List of 10 questions (numbered, with category badge)
- Below questions: CTA box → "Ready to practice? Upload your resume and answer these with AI feedback. Free to start." → "Start Practicing Free" button

Implementation:
- This page is PUBLIC (no auth required)
- Use Next.js Server Action to call GPT-4o-mini
- Rate limit: 5 generations per IP per hour (use Vercel's rate limiting or simple Redis-based)
- Cache: same role+level+domain combo cached for 24 hours (Vercel KV or simple in-memory)
- Questions generated from a simplified prompt (NOT the full resume-based prompt)
- SEO: proper meta title, description, structured data for "tool" schema

### DELIVERABLE 3: Score Share Card

**src/components/report/ShareCard.tsx**
- Generate a shareable image card showing:
  - InterviewEra branding (logo + tagline)
  - Role practiced: "Software Engineer Mock Interview"
  - Overall score: big bold "7.2/10"
  - Radar chart (small version, 5 dimensions)
  - CTA: "Can you beat my score? interviewera.com/[referralCode]"
- Implementation: Use html2canvas or @vercel/og to generate PNG
- Dimensions: 1080x1080px (square — works for WhatsApp and Instagram)

**src/app/api/share/card/route.ts**
- GET ?interviewId=[id]&userId=[id]
- Generate OG image using @vercel/og
- Cache for 24 hours
- Verify interview belongs to user

**In Score Report page:** After report shown, add:
- "Share your score" button
- Modal: preview of share card + "Copy Link" + "Download Image" + direct share buttons

### DELIVERABLE 4: Referral System

**Database: referrals table** (already in schema — verify it exists)

**src/app/api/referral/apply/route.ts**
```typescript
// POST — Apply referral after friend's first interview completion
// Input: { referralCode: string }
// Steps:
// 1. Look up referrer by referral code
// 2. Check: referred user hasn't been credited before
// 3. Check: this is the referred user's first completed interview
// 4. Award +1 credit to both referrer AND referred user
// 5. Update referrals table: status → 'credited'
// 6. Log to credit_transactions for both users
```

**Referral Code System:**
- On user signup: generate unique referral code (8 chars, alphanumeric)
- Store in users table (add referral_code column to migration — add to 001 or create 002)
- User's referral link: `{APP_URL}/join?ref=[referralCode]`

**Referral Link Handling:**
- src/app/(marketing)/join/page.tsx → store referral code in cookie → redirect to /signup
- On signup: read referral cookie → create referrals record { referrer_id, referred_id, status: 'pending' }
- On first interview complete: trigger /api/referral/apply

**Post-Interview Referral CTA (in score report):**
```
"Challenge a friend to beat your score."
[Share card preview]
[Copy referral link button]
[WhatsApp share button: "I scored 7.2/10 on my Software Engineer mock interview! Beat it: {link}"]
```

### DELIVERABLE 5: Campus Landing Page

**src/app/(marketing)/campus/page.tsx**
Sections (top to bottom):
1. Hero: "AI Mock Interviews for Your Entire Placement Batch"
   Sub: "₹799/student/year. Train 50–500 students at once. Used by placement officers across India."
   CTA: "Book a Free Demo" → opens Calendly embed
2. Problem: "Your students need 20+ mock interviews. Your team can conduct 2."
3. Solution: 3 cards — AI available 24/7, Instant feedback, Track cohort progress
4. Social proof placeholder: "Join 10+ colleges (slots open)" with 3 fake college logos (blur/generic)
5. Pricing: ₹799/student/year, minimum 50 seats = ₹39,950 minimum deal
6. FAQ: 5 common placement officer questions
7. CTA: "Schedule a 20-minute demo" → Calendly embed (use Calendly widget embed)
8. Footer with contact email

### DELIVERABLE 6: Main Landing Page

**src/app/(marketing)/page.tsx** — The most important page
Above the fold (everything visible without scrolling):
- Navbar: Logo | "For Colleges" link | Login | Sign Up
- Headline: "Get interview-ready in 6 questions"
- Subheadline: "Upload your resume. Get AI-personalized mock interview. Get scored. Repeat."
- **RESUME UPLOAD ZONE**: Drag-drop PDF upload — primary CTA, above the fold
  - "Upload your resume → Get your first AI mock interview free"
  - Accept: PDF/DOCX/TXT
  - On upload (without auth): redirect to /signup with resume pre-queued
  - OR if user is logged in: parse immediately → redirect to /interview/new
- Trust signals: "Free • No credit card • 60 seconds to first interview"

Below fold:
- How it works (3 steps: Upload → Practice → Improve)
- Score report preview screenshot (mockup)
- Social proof: "Join 1,000+ students already practicing" (update dynamically)
- Competitive comparison table (vs Pramp, vs ChatGPT, vs college placement cell)
- Pricing section (Free / Starter / Pro cards)
- Footer

## TESTING CHECKLIST
- [ ] Razorpay checkout opens correctly with subscription details
- [ ] Webhook correctly upgrades user plan on subscription.activated
- [ ] User's credits top up on subscription.charged (monthly)
- [ ] Question Generator works without login (public page)
- [ ] Question Generator rate limits to 5/hour per IP
- [ ] Share card generates correctly (1080x1080, correct score shown)
- [ ] Referral link stores code in cookie and creates pending referral record
- [ ] Both users receive +1 credit on referral completion
- [ ] Campus page has working Calendly embed
- [ ] Landing page resume upload works for both logged-in and logged-out users
- [ ] Landing page loads in < 2 seconds (check Vercel analytics)

## OUTPUT FORMAT
Complete code for each deliverable. Any Razorpay configuration that requires 
manual setup in Razorpay dashboard — list explicitly with exact steps.
End with "Phase 1 Complete" checklist status.
```

---

## ═══════════════════════════════════════
## PROMPT 5: PHASE 2 — WEEK 7-8
## Pro Tier + Blurred Preview + Annual Plans + Placement Countdown
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 2 — Conversion Optimization | Week: 7-8
MVP Status: Phase 1 complete. Core loop functional. Starter plan live.
This session: Launch Pro tier + unlock blurred features + add annual plan upsell + 
              Placement countdown feature

Open CLAUDE.md first. Verify current phase tracker shows Phase 2.

## DELIVERABLES

### DELIVERABLE 1: Pro Tier Activation

**Updates to Razorpay integration:**
- Add Pro plan (₹249/mo) to /api/payments/create-order
- Create Pro plan in Razorpay dashboard (document exact plan_id format)
- Update webhook to handle Pro subscription events (30 credits/month topup)

**Update Pricing Page:**
- Remove "Coming Soon" from Pro tier
- Show feature comparison clearly
- Most popular badge on Pro
- Annual plans toggle (monthly/annual switch at top)
  - Annual: Starter ₹799/yr (₹67/mo, save 33%), Pro ₹1999/yr (₹167/mo, save 33%)
  - Annual plans NOT shown on first upgrade prompt — only in /upgrade page

### DELIVERABLE 2: Pro Feature Unlocks

**Model Answer Comparisons (Pro only):**
- Evaluate-answer API: if user is Pro, include model_answer in evaluation response
- Report page: show model answer comparison below each user answer (Pro only)
- For non-Pro: show blurred placeholder text "Model answer: [lorem ipsum]" with upgrade CTA

**Keyword Gap Analysis (Pro only):**
- In evaluation: include keywords_missing[] in detailed_analysis
- Report page: show keyword cloud — green (used by candidate), red (missed keywords)
- For non-Pro: show 3 blurred keyword chips + "See all N missing keywords — Upgrade"

**Trend Chart (Starter + Pro):**
- Report page: show score trend chart (line chart) using recharts
- X-axis: interview dates, Y-axis: overall score
- Show only if >= 2 completed interviews

### DELIVERABLE 3: Placement Countdown Feature

**Add to users table (migration 002):**
```sql
-- Migration 002: Add placement countdown
alter table public.users add column if not exists placement_date date;
-- (Already in original schema — verify it exists, if not add it)
```

**Placement Date Collection:**
- On first login (if placement_date is null): show modal
  "When is your placement season?"
  Month dropdown + Year dropdown (current year + next year)
  "Skip for now" option (but show again in 3 days)

**Countdown Banner Component (src/components/layout/PlacementCountdown.tsx):**
```
"📅 47 days until your placement season. You've completed 3 of 20 target interviews."
```
- Show on dashboard, persistent at top
- Color: green > 30 days, yellow 10-30 days, red < 10 days
- "20 target interviews" is the default target — not configurable in v2
- Hide after placement date passes

### DELIVERABLE 4: Conversion-Optimized Credit Exhaustion Flow

**When user hits 0 credits:**
- Don't just show generic "upgrade" page
- Show: trend chart (all 5 interview scores so far)
- Show: "Students who complete 15+ interviews score 40% higher in real placements"
- Show: Starter (₹99/mo) as PRIMARY CTA — big button
- Show: Pro (₹249/mo) as secondary — smaller
- Do NOT show annual plans here (adds decision complexity)

**Credit Warning States:**
- 2 credits left: yellow banner on dashboard "2 interviews remaining on free plan"
- 1 credit left: orange toast on interview start "This is your last free interview"
- 0 credits: full upgrade screen (above)

## TESTING CHECKLIST
- [ ] Pro plan subscription works end-to-end
- [ ] Pro users see model answers in score report
- [ ] Non-Pro users see blurred model answers with upgrade CTA
- [ ] Trend chart appears after 2+ completed interviews
- [ ] Placement countdown shows correct days remaining
- [ ] Credit exhaustion screen shows trend + correct CTAs
- [ ] Annual plan pricing shown correctly in /upgrade page
- [ ] Annual plans NOT shown on credit exhaustion screen
```

---

## ═══════════════════════════════════════
## PROMPT 6: PHASE 2 — WEEK 9-10
## Email Digest + ATS Tool + Analytics Setup
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 2 — Conversion Optimization | Week: 9-10
Completed: Pro tier live, blurred previews working, annual plans, countdown
This session: Weekly email digest + ATS Resume Checker tool + PostHog analytics

Open CLAUDE.md first. Confirm current phase.

## DELIVERABLES

### DELIVERABLE 1: Weekly Score Email Digest

**Email Template (via Resend):**
Subject: "Your InterviewEra weekly report — [Date]"

Content (keep it SHORT — 3 lines max):
```
Hi [Name],

Last week: 3 interviews completed, avg score 6.8/10 (+0.4 from previous week)
Weakest area: Technical Depth (5.2 avg) — focus on this in your next session

[Practice Now] button
```
No marketing copy. No upsells. Just the data.

**Implementation:**
- src/lib/email/weekly-digest.ts: Function to generate and send digest via Resend
- Data required: last 7 days interviews, avg score, score delta vs previous 7 days, weakest dimension
- Trigger: Vercel Cron Job (every Monday 9 AM IST = Sunday 3:30 AM UTC)
- src/app/api/cron/weekly-digest/route.ts: Handler for Vercel cron
- Only send to: users who completed at least 1 interview in last 14 days
- Add unsubscribe link (simple: /api/email/unsubscribe?token=[hash])

**Resend Setup:**
- Email domain: transactional@interviewera.com (configure DNS)
- From name: "InterviewEra"
- Reply-to: support@interviewera.com

### DELIVERABLE 2: ATS Resume Checker (Free Tool #2)

**src/app/(marketing)/tools/ats-checker/page.tsx**
SEO target: "ATS resume checker" (22k monthly searches)

UI:
- Heading: "Free ATS Resume Checker"
- Sub: "Find out if your resume passes Applicant Tracking Systems. Instant results."
- Upload: Resume PDF (public, no auth)
- Input: Job description text (optional)
- Button: "Check My Resume →"

Output (show as score card):
- ATS Compatibility Score: 72/100
- Issues found: [list]
  - ✅ Proper section headings (Experience, Education, Skills)
  - ❌ Missing action verbs in 3 experience bullets
  - ⚠️ Font may not parse correctly (non-standard font detected)
  - ✅ No tables or columns (ATS-safe layout)
  - ❌ Skills section missing keywords from job description
- Below: "Practice answering questions about your resume" → CTA to main product

**Implementation:**
- Public route (no auth)
- Rate limit: 3 checks per IP per hour
- Use GPT-4o-mini to analyze extracted text against ATS criteria
- Prompt: evaluate for ATS compatibility, return JSON with score + issues array
- Cache: same resume hash cached for 1 hour

### DELIVERABLE 3: PostHog Analytics Setup

**Install and configure PostHog:**
src/lib/analytics/posthog.ts:
- Initialize PostHog with NEXT_PUBLIC_POSTHOG_KEY
- Browser-side only (no SSR tracking)

**Key Events to Track (implement tracking calls in each location):**

```typescript
// Event schema — track these EXACTLY, spelling matters for dashboards
posthog.capture('resume_uploaded', { fileType, fileSize, userId })
posthog.capture('interview_started', { role, difficulty, creditsRemaining, userId })
posthog.capture('answer_submitted', { questionNumber, answerLength, interviewId })
posthog.capture('interview_completed', { questionCount, totalDuration, interviewId })
posthog.capture('report_viewed', { overallScore, userPlan, interviewId })
posthog.capture('upgrade_cta_clicked', { location, fromPlan, toPlan })
posthog.capture('payment_initiated', { plan, amount })
posthog.capture('payment_completed', { plan, amount })
posthog.capture('share_card_generated', { score, role })
posthog.capture('referral_link_copied', { userId })
posthog.capture('tool_used', { toolName, role })
posthog.capture('credit_exhausted', { totalInterviewsCompleted })
```

**Funnel Definition (document in PostHog dashboard):**
1. Page visited
2. resume_uploaded
3. interview_started
4. interview_completed
5. report_viewed
6. upgrade_cta_clicked
7. payment_completed

**Feature Flags (set up in PostHog for A/B testing):**
- `free_credit_count`: 5 (control) vs 7 (variant) — test conversion impact
- `first_interview_questions`: 6 (control) vs 4 (variant) — test completion rate

## TESTING CHECKLIST
- [ ] Weekly email sends to test address with correct data
- [ ] Unsubscribe link works and marks user as unsubscribed
- [ ] ATS checker returns score + issues for a sample resume
- [ ] ATS checker rate limits after 3 requests
- [ ] All PostHog events fire in browser Network tab
- [ ] Funnel visible in PostHog dashboard
- [ ] Feature flags accessible in code (even if not active yet)
```

---

## ═══════════════════════════════════════
## PROMPT 7: PHASE 3 — WEEK 11-12
## Voice Mode + STAR Tool + Interview Replay
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 3 — Engagement & Growth | Week: 11-12
Completed: Full text-based interview loop, payments, email, 2 free tools, analytics
This session: Voice mode (Chrome desktop first) + STAR tool + Interview Replay (Pro)

Open CLAUDE.md. Note: Voice is P1 — implement carefully, fallback is mandatory.

## DELIVERABLES

### DELIVERABLE 1: Voice Mode (STT — Chrome Desktop First)

**Architecture Decision (read carefully):**
- Use browser's Web Speech API (SpeechRecognition) — no external STT cost for Phase 3
- Supported: Chrome desktop ✅, Safari (partial) ⚠️, Mobile Chrome ⚠️
- Fallback: If SpeechRecognition unavailable → gracefully fall back to text mode with toast
  "Voice mode isn't supported in this browser. Using text mode instead."

**src/hooks/useSpeechRecognition.ts:**
```typescript
// Hook that wraps Web Speech API
// Returns: { isListening, transcript, startListening, stopListening, isSupported }
// isSupported: check window.SpeechRecognition || window.webkitSpeechRecognition
// Auto-stop after 30 seconds of no speech
// interim_results: true (show live transcript)
// language: 'en-IN' (Indian English — better accent recognition)
```

**src/components/interview/VoiceAnswerInput.tsx:**
- Toggle: Text mode | Voice mode (tab switcher at top of answer area)
- Voice mode UI:
  - Big microphone button (pulsing animation when recording)
  - Live transcript text area (real-time, editable before submit)
  - "Recording..." | "Tap mic to start"
  - Timer: show recording duration
  - "Use this answer" button (submits the transcript)
- Text mode: existing AnswerInput component
- Default: Text mode (voice is opt-in per session)

**Answer API Update:**
- answer_mode: 'text' | 'voice' — already in schema, just set correctly

### DELIVERABLE 2: STAR Method Answer Builder (Free Tool #3)

**src/app/(marketing)/tools/star-builder/page.tsx**
SEO target: "STAR method examples" + "behavioral interview answers"

UI:
- Heading: "Free STAR Method Answer Builder"
- Sub: "Structure your behavioral interview answers like a pro. Takes 2 minutes."
- Form inputs:
  - Situation: "What was the context?" (textarea)
  - Task: "What was your responsibility?" (textarea)
  - Action: "What did you do specifically?" (textarea)
  - Result: "What was the outcome? Include numbers if possible." (textarea)
  - Target role: "What role is this answer for?" (text)
- Button: "Build My STAR Answer →"
- Output: 
  - Polished 150-200 word answer using their input
  - Quality score: Structure / Specificity / Impact (3 mini scores)
  - Improvement suggestions: 2-3 bullet points
  - CTA: "Now test this answer in a real mock interview" → main product

**Implementation:**
- Public, no auth
- GPT-4o-mini to polish the STAR answer and score it
- Rate limit: 5 per IP per hour

### DELIVERABLE 3: Interview Replay (Pro Feature)

**src/app/(dashboard)/report/[id]/replay/page.tsx**
- Pro-only feature (check tier, redirect to upgrade if not Pro)

UI:
- List of questions on the left sidebar
- Main area: Q→ Your Answer → AI Evaluation → Model Answer (side by side)
- Your answer: as you typed it
- Model answer: generated at evaluation time (store in detailed_analysis.model_answer_hint)
- Scores: dimension breakdown bar chart for each question
- Navigation: Previous/Next question buttons

**Implementation:**
- Fetch interview + all questions + all answers + all evaluations + report
- Read-only view — no editing
- "Practice Again" button at bottom

## TESTING CHECKLIST
- [ ] Voice mode toggle works in Chrome desktop
- [ ] Voice mode shows live transcript while speaking
- [ ] Voice mode falls back to text with toast on unsupported browsers
- [ ] Submitted voice answer stored with answer_mode = 'voice'
- [ ] STAR builder produces grammatically correct polished answer
- [ ] STAR builder scores the answer on 3 dimensions
- [ ] Interview Replay shows questions + answers + model answers
- [ ] Replay redirects non-Pro users to upgrade page
```

---

## ═══════════════════════════════════════
## PROMPT 8: PHASE 3 — WEEK 13-14
## Domain Packs + PDF Export + SEO + Upgrade Prompts
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 3 — Engagement & Growth | Week: 13-14
Completed: Voice mode, STAR tool, Interview Replay
This session: Domain interview packs + PDF export + SEO optimization + smart upgrade prompts

## DELIVERABLES

### DELIVERABLE 1: Domain Interview Packs (Pro Feature)

**Domain packs:** Pre-built question sets for specific interview types.
- DSA (Data Structures & Algorithms)
- System Design
- HR / Behavioral

**Database addition:**
```sql
-- Migration 003
create table public.domain_packs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  domain text not null, -- 'dsa' | 'system_design' | 'hr'
  description text,
  question_count integer,
  is_active boolean default true
);

create table public.domain_pack_questions (
  id uuid primary key default uuid_generate_v4(),
  pack_id uuid references public.domain_packs(id),
  question_text text not null,
  rubric jsonb,
  category text,
  difficulty text
);
-- No RLS needed — these are public read
```

**Seed data:** Write seed SQL with 15+ questions per pack for DSA, System Design, HR.

**Interview start update:**
- Add option: "Use Domain Pack" toggle in /interview/new
- If domain pack selected: questions fetched from domain_pack_questions (not GPT-generated)
- Pro-only: domain packs (check tier before showing)

### DELIVERABLE 2: PDF Report Export (Pro Feature)

**Tech:** Use @react-pdf/renderer for server-side PDF generation

**src/app/api/report/export-pdf/route.ts:**
- GET ?reportId=[id]
- Verify user is Pro AND owns the report
- Generate PDF with:
  - Page 1: Overall score, radar chart (as image), date, role
  - Page 2: Per-question scores + one-line feedback each
  - Page 3: Detailed analysis (improvements + model answer hints)
- Return as PDF blob with Content-Disposition: attachment
- Cache generated PDF for 24 hours

**Report page:** Add "Export PDF" button (Pro badge next to it for non-Pro)

### DELIVERABLE 3: SEO Optimization

**All free tool pages — add:**
```typescript
// In each tool page:
export const metadata = {
  title: "Free Interview Question Generator | InterviewEra",
  description: "Generate role-specific interview questions in 10 seconds. Free tool for placement preparation.",
  openGraph: { ... },
  structuredData: { "@type": "WebApplication", ... }
}
```

**Blog content pages (create 3 skeleton pages):**
- /blog/how-to-prepare-for-placement-interviews
- /blog/top-interview-questions-for-software-engineers  
- /blog/what-is-star-method-with-examples
Each: 1500+ word article structure, proper H1-H6, internal links to tools

**Sitemap:** src/app/sitemap.ts — auto-generate sitemap including all tool and blog pages

### DELIVERABLE 4: Smart Upgrade Prompts

Track usage patterns and show contextual upgrade CTAs:

**After 8-10 Starter interviews with score plateau:**
- Detect: user's last 3 scores differ by < 0.3
- Show: "Your scores have plateaued at ~6.8. Pro users get detailed analysis that breaks through plateaus."
- CTA: Upgrade to Pro

**After Starter user hits monthly credit limit (12 interviews):**
- Show credit top-up option: "Buy 10 extra credits for ₹79" (one-time, no subscription)
  OR upgrade to Pro for 30 credits/month

Wait — one-time credit purchase is NOT in PRD. Skip the credit purchase option.
Just show: Pro upgrade is the only path for more credits.

## TESTING CHECKLIST
- [ ] Domain pack questions load correctly for DSA/System Design/HR
- [ ] Domain packs only accessible to Pro users
- [ ] PDF exports correctly with all 3 pages
- [ ] PDF button shows "Pro" lock icon for non-Pro users
- [ ] All tool pages have proper meta tags
- [ ] Sitemap includes all pages
- [ ] Upgrade prompt appears after score plateau detection
```

---

## ═══════════════════════════════════════
## PROMPT 9: PHASE 4 — WEEK 15-20
## Campus Dashboard + Scale + Performance
## ═══════════════════════════════════════

```
[CONTEXT ANCHOR — READ FIRST]
Project: InterviewEra v2.0
Phase: 4 — Scale & B2B | Week: 15-20
Prerequisite: Only build campus dashboard AFTER 3 manual B2B deals are signed.
              If <3 deals signed, skip dashboard and do performance work first.

This session: Campus admin dashboard + bulk onboarding + load testing + AI fallback evaluation

## DELIVERABLE 1: Campus Admin Dashboard (Only if 3 B2B deals signed)

**New role: 'campus_admin'**
```sql
-- Migration 004
alter type plan_tier add value 'campus_admin';
create table public.campus_organizations (
  id uuid primary key,
  name text,
  admin_user_id uuid references auth.users(id),
  seat_count integer,
  plan_start date,
  plan_end date,
  razorpay_payment_id text
);
-- Bypass RLS for campus_admin role on interviews/reports for their org
```

**src/app/admin/dashboard/page.tsx** (campus admin only):
- Total students enrolled vs seats
- Avg score across all students
- Interview completion rate per student
- Top/bottom performers (anonymized unless admin sets otherwise)
- Export: CSV of all student scores

**Bulk student onboarding:**
- Upload CSV: email list → system sends invite emails via Resend
- Student accepts invite → account created under campus org → Campus plan activated

## DELIVERABLE 2: Performance Optimization

**Load Testing Target:** 1,000 concurrent users
- Use k6 or Artillery for load testing
- Test: /api/interview/answer (most frequent + most expensive endpoint)
- Identify: p95 latency under load
- Fix: Add request queuing if OpenAI rate limits hit under load

**Caching Strategy:**
- Redis (Upstash) for: rate limiting, session caching, question generation caching
- Cache question sets for same {role, difficulty, resume hash} combination
- TTL: 1 hour for question cache

**Database Optimization:**
- Add missing indexes for common queries:
  interviews: (user_id, status), (user_id, completed_at)
  evaluations: (answer_id)
  reports: (interview_id)
- Analyze slow queries using Supabase query analyzer

## DELIVERABLE 3: AI Fallback Evaluation (Only if >5% rate-limited requests in monitoring)

CONDITION: Only implement if PostHog/monitoring shows OpenAI rate limit errors 
affecting >5% of evaluation requests. Otherwise skip this deliverable.

If implementing:
- Add Mistral-7B via Mistral API as Layer 2
- Fallback trigger: After 3 OpenAI retries exhausted
- Use SAME evaluation prompt format (Mistral supports same JSON output)
- Log: which provider handled each evaluation (for monitoring)

## TESTING CHECKLIST
- [ ] Load test: p95 latency < 5s for /api/interview/answer at 500 concurrent users
- [ ] Campus admin can see all students in their org
- [ ] Bulk invite sends emails and creates accounts correctly
- [ ] Rate limiting working with Redis
- [ ] All indexes in place (check with EXPLAIN ANALYZE)
```

---

# PART 5: QUICK REFERENCE CHEATSHEET
## (Print this or keep open during development)

```markdown
## InterviewEra Quick Reference

### Credit Rules
- Free: 5 lifetime | Starter: 12/mo | Pro: 30/mo | Campus: unlimited
- Deduct on START (not completion)
- Referral: +1 for both users on friend's first interview completion

### Question Count Rules
- First interview ALWAYS: 6 questions
- Subsequent: user can choose 6, 8, or 10
- Domain packs: 6 questions pulled from pack (Pro only)

### Score Report Visibility
- Free & Starter: Detailed Analysis = BLURRED
- Free, Starter & old Pro: Model Answers = BLURRED  
- Pro only: Everything visible
- Trend chart: Starter + Pro (needs 2+ interviews)

### API Latency SLAs
- Resume parse: < 8s | Interview start: < 4s | Per answer eval: < 3s | Report: < 5s

### AI Prompt Rules
- Always use EXACT templates from CLAUDE.md
- Always validate response is valid JSON before storing
- Always set temperature = 0.7 for questions, 0.3 for evaluations (consistency)
- Always include "Return ONLY valid JSON, no markdown, no explanation" in prompts

### Error Messages (Show to Users)
- No credits: "You've used all your free interviews. Upgrade to continue practicing."
- AI unavailable: "AI temporarily unavailable. Try again in 30 seconds."
- Parse failed: "We couldn't parse your resume automatically. Please enter your details manually."
- Payment failed: "Payment unsuccessful. Please try a different payment method."

### Pricing (in paise for Razorpay)
- Starter monthly: ₹99 = 9900 paise
- Pro monthly: ₹249 = 24900 paise
- Starter annual: ₹799 = 79900 paise
- Pro annual: ₹1999 = 199900 paise
- Campus: Custom (manual invoicing)

### Phase Guard (Before Each Session)
1. Read CLAUDE.md
2. Check Phase Tracker — what's complete?
3. Confirm single session goal
4. Check if any earlier deliverable is blocking current work
```

---

*Master Prompt System — InterviewEra v2.0*
*Generated by Lyra | March 31, 2026*
*Based on PRD v2.0 + Hinglish Mode Guide*
