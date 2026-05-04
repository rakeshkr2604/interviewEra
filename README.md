# InterviewEra

AI-powered mock interview practice SaaS for Indian students.

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **UI:** shadcn/ui + motion/react animations
- **Backend:** Next.js API Routes + Server Actions
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email + Google OAuth)
- **AI:** GPT-4o-mini (OpenAI) + Mistral fallback
- **Payments:** Razorpay (UPI + card + netbanking)
- **Email:** Resend
- **Analytics:** Vercel Analytics
- **Caching:** Upstash Redis

## Interview Flow
1. Onboarding (goal + role + resume)
2. Avatar selection (Priya / Arjun)
3. Pre-interview briefing + checklist
4. Live interview session (avatar video + TTS + real-time transcript + timer)
5. Score report (radar chart + filler word analysis + AI feedback)

## Setup
```bash
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

## Supabase Migrations
Run in order in Supabase SQL Editor:
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_rpc_functions.sql
3. supabase/migrations/003_email_preferences.sql
4. supabase/migrations/004_domain_packs.sql
5. supabase/migrations/005_campus.sql
6. supabase/migrations/006_indexes.sql
7. supabase/migrations/007_referral_code.sql

## Key Files
- `CLAUDE.md` — Project rules and context (read before every session)
- `src/lib/theme/ThemeProvider.tsx` — Dark/light mode system
- `src/lib/filler-words/config.ts` — Filler word detection config
- `src/types/avatar.types.ts` — Avatar configuration
