# InterviewEra

AI-powered mock interview practice SaaS for Indian students.

## Tech Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4
- **UI:** shadcn/ui + motion/react animations
- **Backend:** Next.js API Routes + Server Actions
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email + Google OAuth)
- **AI:** OpenRouter-routed multi-model (no Mistral fallback — removed as dead code, see CLAUDE.md Critical Invariant #9)
- **Payments:** Razorpay (UPI + card + netbanking)
- **Email:** Resend
- **Analytics:** GA4 + Microsoft Clarity + Vercel Analytics
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
Run every file in `supabase/migrations/` in ascending numeric order (45+ sequential files as of this writing — don't hardcode a count or file list here, it will go stale; check the directory).

## Key Files
- `CLAUDE.md` — Project rules and context (read before every session)
- `src/lib/theme/ThemeProvider.tsx` — Dark/light mode system
- `src/lib/filler-words/config.ts` — Filler word detection config
- `src/types/avatar.types.ts` — Avatar configuration
