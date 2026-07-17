/**
 * Live verification: 5 fresh v2.1 script sessions with real browser + cookies.
 * Cookie auth matches e2e/global-setup.ts (sb-*-auth-token).
 *
 *   npx tsx scripts/verify-script-startup-5x.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { chromium, type ConsoleMessage } from '@playwright/test'

config({ path: resolve(process.cwd(), '.env.local') })

const BASE = process.env.VERIFY_BASE_URL?.trim() || 'http://localhost:3000'
const RUNS = Number(process.env.VERIFY_RUNS ?? 5)
const OUT_DIR = resolve(process.cwd(), '.verify-out')

type RunMetrics = {
  run: number
  interviewId: string
  tokenCalls: {
    newMints: number
    refreshes: number
    total: number
    statuses: number[]
    had429: boolean
  }
  noneTurnCount: number
  greetingDuplicate: boolean
  mic_ready_after_greeting_ms: number | null
  turn_applied_fetch_to_apply_ms: number | null
  pageUrlAfterLoad: string
  errors: string[]
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

function supabaseAuthCookieName(supabaseUrl: string): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

async function seedUserAndInterview(run: number) {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `verify5x-r${run}-${Date.now()}@interviewera-mail.test`
  const password = `VerifyPass1!${Date.now().toString(36)}`
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Verify Candidate' },
  })
  if (error || !created.user) throw new Error(`createUser: ${error?.message}`)

  await admin.from('users').upsert(
    {
      id: created.user.id,
      email,
      name: 'Verify Candidate',
      onboarding_completed: true,
      credits_remaining: 20,
      plan_tier: 'free',
    },
    { onConflict: 'id' },
  )

  const { data: resume, error: resumeErr } = await admin
    .from('resumes')
    .insert({
      user_id: created.user.id,
      status: 'parsed',
      parsed_data: {
        target_role: 'Associate Developer',
        skills: ['JavaScript', 'React'],
        experience_estimate: 'Fresher / student',
      },
      raw_text: 'Verify Candidate fresher resume',
    })
    .select('id')
    .single()
  if (resumeErr || !resume) throw new Error(`resume: ${resumeErr?.message}`)

  const { data: interview, error: intErr } = await admin
    .from('interviews')
    .insert({
      user_id: created.user.id,
      resume_id: resume.id,
      role: 'Associate Developer',
      difficulty: 'easy',
      interviewer_id: 'priya',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      question_count: 4,
      session_context: {
        goal: 'fresher_placement',
        interviewMode: 'hr_behavioral',
        experienceYears: 0,
        interviewerId: 'priya',
      },
      engine: 'v2.1',
      script_type: 'SCRIPT_H',
      self_intro_enabled: false,
      is_returning_user: false,
      max_skips: 2,
      skips_used: 0,
      current_turn_index: 0,
    })
    .select('id')
    .single()
  if (intErr || !interview) throw new Error(`interview: ${intErr?.message}`)

  const browserClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: session, error: signErr } = await browserClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signErr || !session.session) throw new Error(`signIn: ${signErr?.message}`)

  return {
    interviewId: interview.id as string,
    session: session.session,
    supabaseUrl: url,
  }
}

async function runOne(run: number): Promise<RunMetrics> {
  const errors: string[] = []
  const tokenEvents: Array<{ refresh: boolean; status: number }> = []
  let noneTurnCount = 0
  let micReadyMs: number | null = null
  let turnAppliedMs: number | null = null
  let pageUrlAfterLoad = ''

  const seeded = await seedUserAndInterview(run)
  const interviewId = seeded.interviewId

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  const context = await browser.newContext({ permissions: ['microphone'] })

  const cookieName = supabaseAuthCookieName(seeded.supabaseUrl)
  const cookieValue = encodeURIComponent(JSON.stringify(seeded.session))
  const baseHost = new URL(BASE).hostname
  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: baseHost,
      path: '/',
      httpOnly: false,
      secure: BASE.startsWith('https'),
      sameSite: 'Lax',
    },
  ])

  const page = await context.newPage()

  page.on('console', async (msg: ConsoleMessage) => {
    const text = msg.text()
    let payload: Record<string, unknown> | null = null
    try {
      if (msg.args().length >= 2) {
        payload = (await msg.args()[1].jsonValue()) as Record<string, unknown>
      }
    } catch {
      /* */
    }
    if (text.includes('mic_ready_after_greeting') && payload?.elapsed_ms != null) {
      micReadyMs = Number(payload.elapsed_ms)
    }
    if (text.includes('turn_applied') && payload?.fetch_to_apply_ms != null) {
      turnAppliedMs = Number(payload.fetch_to_apply_ms)
    }
  })

  page.on('request', (req) => {
    if (!req.url().includes('/api/interview/script/turn')) return
    try {
      const body = req.postDataJSON() as { lastAnswer?: string } | null
      if (body?.lastAnswer === '[NONE]') noneTurnCount += 1
    } catch {
      /* */
    }
  })

  page.on('response', (res) => {
    if (!res.url().includes('/api/stt/token')) return
    let refresh = false
    try {
      const body = res.request().postDataJSON() as { refresh_lease_id?: string } | null
      refresh = Boolean(body?.refresh_lease_id)
    } catch {
      /* */
    }
    tokenEvents.push({ refresh, status: res.status() })
  })

  try {
    await page.goto(`${BASE}/interview/script/${interviewId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    pageUrlAfterLoad = page.url()
    await page.waitForTimeout(20_000)

    const box = page.locator('textarea').first()
    if (await box.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await box.fill('I am doing well and ready to start.')
      const submit = page.getByRole('button', { name: /submit|send/i }).first()
      if (await submit.isVisible().catch(() => false)) {
        await submit.click()
        await page.waitForTimeout(14_000)
      }
    }

    const newMints = tokenEvents.filter((t) => !t.refresh && t.status < 400).length
    const refreshes = tokenEvents.filter((t) => t.refresh && t.status < 400).length

    return {
      run,
      interviewId,
      tokenCalls: {
        newMints,
        refreshes,
        total: newMints + refreshes,
        statuses: tokenEvents.map((t) => t.status),
        had429: tokenEvents.some((t) => t.status === 429),
      },
      noneTurnCount,
      greetingDuplicate: noneTurnCount > 1,
      mic_ready_after_greeting_ms: micReadyMs,
      turn_applied_fetch_to_apply_ms: turnAppliedMs,
      pageUrlAfterLoad,
      errors,
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
    return {
      run,
      interviewId,
      tokenCalls: { newMints: 0, refreshes: 0, total: 0, statuses: [], had429: false },
      noneTurnCount,
      greetingDuplicate: false,
      mic_ready_after_greeting_ms: micReadyMs,
      turn_applied_fetch_to_apply_ms: turnAppliedMs,
      pageUrlAfterLoad,
      errors,
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  if (!(await fetch(BASE).catch(() => null))) {
    console.error('Dev server not reachable:', BASE)
    process.exit(1)
  }

  const runs: RunMetrics[] = []
  for (let i = 1; i <= RUNS; i++) {
    console.log(`\n--- Run ${i}/${RUNS} ---`)
    const m = await runOne(i)
    runs.push(m)
    console.log(JSON.stringify(m, null, 2))
    if (m.tokenCalls.had429) {
      console.error('REGRESSION: 429')
      break
    }
    if (m.greetingDuplicate) {
      console.error('REGRESSION: duplicate [NONE]')
      break
    }
  }

  const micVals = runs.map((r) => r.mic_ready_after_greeting_ms).filter((v): v is number => v != null)
  const turnVals = runs
    .map((r) => r.turn_applied_fetch_to_apply_ms)
    .filter((v): v is number => v != null)

  const summary = {
    generatedAt: new Date().toISOString(),
    runs,
    aggregates: {
      tokenTotals: runs.map((r) => r.tokenCalls),
      greetingDuplicates: runs.filter((r) => r.greetingDuplicate).length,
      noneTurnCounts: runs.map((r) => r.noneTurnCount),
      pageUrls: runs.map((r) => r.pageUrlAfterLoad),
      mic_ready_ms: {
        values: micVals,
        min: micVals.length ? Math.min(...micVals) : null,
        max: micVals.length ? Math.max(...micVals) : null,
        spread: micVals.length ? Math.max(...micVals) - Math.min(...micVals) : null,
      },
      turn_applied_ms: {
        values: turnVals,
        min: turnVals.length ? Math.min(...turnVals) : null,
        max: turnVals.length ? Math.max(...turnVals) : null,
        spread: turnVals.length ? Math.max(...turnVals) - Math.min(...turnVals) : null,
      },
    },
  }

  const outPath = resolve(OUT_DIR, 'script-startup-5x.json')
  writeFileSync(outPath, JSON.stringify(summary, null, 2))
  console.log('\nWrote', outPath)
  console.log(JSON.stringify(summary.aggregates, null, 2))

  const anySession = runs.some((r) => r.noneTurnCount > 0 || r.tokenCalls.total > 0)
  if (!anySession) {
    console.error('NO_SESSION_ACTIVITY — auth/cookie injection likely failed')
    process.exit(2)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
