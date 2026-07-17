/**
 * API-level: simulate lease-preserving token pattern across a full interview's
 * listening phases (warmup + 4 core + candidate_q = 6 reconnects after first mint).
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'

config({ path: resolve(process.cwd(), '.env.local') })

const BASE = 'http://localhost:3000'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = `tokencount-${Date.now()}@interviewera-mail.test`
  const password = 'VerifyPass1!tc'
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  const userId = created!.user!.id
  await admin.from('users').upsert(
    {
      id: userId,
      email,
      name: 'T',
      onboarding_completed: true,
      credits_remaining: 10,
      plan_tier: 'free',
    },
    { onConflict: 'id' },
  )
  const { data: resume } = await admin
    .from('resumes')
    .insert({
      user_id: userId,
      status: 'parsed',
      parsed_data: {
        target_role: 'SE',
        skills: ['JS'],
        experience_estimate: 'Fresher',
      },
      raw_text: 'x',
    })
    .select('id')
    .single()
  const { data: interview } = await admin
    .from('interviews')
    .insert({
      user_id: userId,
      resume_id: resume!.id,
      role: 'SE',
      difficulty: 'easy',
      interviewer_id: 'priya',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      question_count: 4,
      session_context: {
        goal: 'fresher_placement',
        interviewMode: 'hr_behavioral',
        experienceYears: 0,
      },
      engine: 'v2.1',
      script_type: 'SCRIPT_H',
      self_intro_enabled: true,
      is_returning_user: false,
      max_skips: 2,
      skips_used: 0,
      current_turn_index: 0,
    })
    .select('id')
    .single()

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn } = await client.auth.signInWithPassword({ email, password })
  const ref = new URL(url).hostname.split('.')[0]
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value: encodeURIComponent(JSON.stringify(signIn!.session)),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()

  let leaseId: string | undefined
  const results: Array<{ i: number; refresh: boolean; status: number }> = []
  // 7 listening phases: warmup + self_intro + 4 core + candidate_questions
  for (let i = 0; i < 7; i++) {
    const body: Record<string, string> = { interview_id: interview!.id }
    if (leaseId) body.refresh_lease_id = leaseId
    const res = await page.request.post(`${BASE}/api/stt/token`, { data: body })
    const json = (await res.json()) as { session_lease_id?: string }
    if (json.session_lease_id) leaseId = json.session_lease_id
    results.push({ i, refresh: i > 0, status: res.status() })
  }
  await browser.close()

  const newMints = results.filter((r) => !r.refresh && r.status === 200).length
  const refreshes = results.filter((r) => r.refresh && r.status === 200).length
  const had429 = results.some((r) => r.status === 429)
  console.log(
    JSON.stringify(
      {
        interviewId: interview!.id,
        results,
        newMints,
        refreshes,
        had429,
        underBudget: newMints <= 24 && refreshes <= 60 && !had429,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
