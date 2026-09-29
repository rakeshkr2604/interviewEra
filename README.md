# InterviewEra

AI-powered mock interview practice SaaS for Indian students.

## Tech Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4
- **UI:** shadcn/ui + motion/react animations
- **Backend:** Next.js API Routes + Server Actions
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email + Google OAuth)
- **AI:** OpenRouter-routed multi-model (no Mistral fallback — see AGENTS.md Invariant #9)
- **Interview engine:** V2.1 script engine (`/interview/script/*`) — legacy V1 dual-agent removed
- **Payments:** Razorpay (UPI + card + netbanking)
- **Email:** Resend
- **Analytics:** GA4 + Microsoft Clarity + Vercel Analytics
- **Caching:** Upstash Redis

## Interview Flow (V2.1)
1. Resume upload + parse
2. Start at `/interview/script/start`
3. Live script session (`SCRIPT_H` / `SCRIPT_T` / `SCRIPT_M`) with TTS/STT
4. Answer scoring + complete → script report

## Setup
```bash
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

## Supabase Migrations
Run every file in `supabase/migrations/` in ascending numeric order (serial `NNN_name.sql` only). See [`docs/Guidelines/DATABASE_MIGRATIONS.md`](docs/Guidelines/DATABASE_MIGRATIONS.md).

## Key docs
- [`AGENTS.md`](AGENTS.md) — universal agent contract (read first)
- [`docs/INDEX.md`](docs/INDEX.md) — documentation map
- [`MASTER_ENGINEERING_ROADMAP.md`](MASTER_ENGINEERING_ROADMAP.md) — planned work order
- [`CLAUDE.md`](CLAUDE.md) — thin Claude adapter → AGENTS.md
