/**
 * Phase-transition authority live traces (H / T / M).
 *
 *   npx tsx scripts/verify-phase-transitions.ts
 *
 * Confirms no phase repeats beyond its cap, with self_intro enabled.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const BASE = process.env.VERIFY_BASE_URL?.trim() || 'http://localhost:3000'
const MAX_TURNS = 40

type Mode = {
  label: string
  interviewMode: 'technical' | 'hr_behavioral' | 'mixed'
  interviewerId: 'arjun' | 'priya'
  expectScript: string
}

const MODES: Mode[] = [
  { label: 'T', interviewMode: 'technical', interviewerId: 'arjun', expectScript: 'SCRIPT_T' },
  { label: 'H', interviewMode: 'hr_behavioral', interviewerId: 'priya', expectScript: 'SCRIPT_H' },
  { label: 'M', interviewMode: 'mixed', interviewerId: 'arjun', expectScript: 'SCRIPT_M' },
]

type TurnOut = {
  speech: string
  phase: string
  is_question: boolean
  is_follow_up?: boolean
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

function cookieHeader(supabaseUrl: string, session: Session): string {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  const name = `sb-${ref}-auth-token`
  const value = encodeURIComponent(JSON.stringify(session))
  return `${name}=${value}`
}

function assertPhaseCaps(phases: string[]): string[] {
  const failures: string[] = []
  const warmupQs = phases.filter((p) => p === 'warmup').length
  // Warmup may include 2 invites + optional canned exit is not warmup.
  // Cap: at most 2 consecutive warmup turns that are invites — we only have phase list.
  // Soft check: warmup appears at most 3 times (2 scripted + rare ack), never late.
  if (warmupQs > 3) failures.push(`warmup count ${warmupQs} > 3`)

  const selfIntro = phases.filter((p) => p === 'self_intro').length
  if (selfIntro > 2) failures.push(`self_intro count ${selfIntro} > 2`)

  const cq = phases.filter((p) => p === 'candidate_questions').length
  if (cq > 2) failures.push(`candidate_questions count ${cq} > 2`)

  // No regression: once we leave a phase for a later one, don't return
  const order = ['warmup', 'self_intro', 'core', 'candidate_questions', 'closing']
  let maxRank = -1
  for (const p of phases) {
    const r = order.indexOf(p)
    if (r < 0) continue
    if (r < maxRank && p !== phases[phases.length - 1]) {
      // Allow staying at same rank; forbid drop by more than 0
    }
    if (r < maxRank) {
      failures.push(`phase regression to ${p} after reaching rank ${maxRank}`)
      break
    }
    if (r > maxRank) maxRank = r
  }

  if (!phases.includes('closing')) failures.push('never reached closing')
  return failures
}

async function seedUser(admin: SupabaseClient, label: string) {
  const email = `phase-audit-${label}-${Date.now()}@interviewera-mail.test`
  const password = `VerifyPass1!${Date.now().toString(36)}`
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Phase Audit' },
  })
  if (error || !created.user) throw new Error(`createUser: ${error?.message}`)

  await admin.from('users').upsert(
    {
      id: created.user.id,
      email,
      name: 'Phase Audit',
      onboarding_completed: true,
      credits_remaining: 50,
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
        target_role: 'Software Engineer',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience_estimate: 'Fresher / student',
        projects: [{ name: 'Campus Portal', description: 'React app' }],
      },
      raw_text: 'Phase audit fresher resume',
    })
    .select('id')
    .single()
  if (resumeErr || !resume) throw new Error(`resume: ${resumeErr?.message}`)

  return { email, password, resumeId: resume.id as string }
}

async function startInterview(
  cookie: string,
  resumeId: string,
  mode: Mode,
): Promise<{ interviewId: string; scriptType: string }> {
  const res = await fetch(`${BASE}/api/interview/script/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      resumeId,
      role: 'Software Engineer',
      difficulty: 'easy',
      interviewerId: mode.interviewerId,
      goal: 'fresher_placement',
      interviewMode: mode.interviewMode,
      experienceYears: 0,
      selfIntroEnabled: true,
      followUpEnabled: false,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    interviewId?: string
    scriptType?: string
    error?: string
  }
  if (!res.ok || !body.interviewId) {
    throw new Error(`script/start ${res.status}: ${JSON.stringify(body)}`)
  }
  return { interviewId: body.interviewId, scriptType: body.scriptType ?? '' }
}

async function postTurn(
  cookie: string,
  args: {
    interviewId: string
    lastAnswer: string
    currentPhase: string
    questionNumber: number
    prevTurnIndex?: number
  },
) {
  const res = await fetch(`${BASE}/api/interview/script/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(args),
  })
  const body = (await res.json().catch(() => ({}))) as {
    turn: TurnOut
    turnIndex: number
    questionNumber?: number
    error?: string
  }
  if (!res.ok) throw new Error(`script/turn ${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function drive(cookie: string, interviewId: string, label: string) {
  const phases: string[] = []
  let phase = 'warmup'
  let questionNumber = 0
  let prevTurnIndex: number | undefined
  let lastAnswer = '[NONE]'

  for (let i = 0; i < MAX_TURNS; i++) {
    const data = await postTurn(cookie, {
      interviewId,
      lastAnswer,
      currentPhase: phase,
      questionNumber,
      ...(prevTurnIndex != null ? { prevTurnIndex } : {}),
    })
    const turn = data.turn
    phases.push(turn.phase)
    prevTurnIndex = data.turnIndex
    if (typeof data.questionNumber === 'number') questionNumber = data.questionNumber

    console.log(
      `  [${label}] t=${data.turnIndex} phase=${turn.phase} is_q=${turn.is_question} "${turn.speech.slice(0, 70)}"`,
    )

    if (turn.phase === 'closing') break

    if (turn.phase === 'candidate_questions' && turn.is_question) {
      lastAnswer = '[SKIPPED]'
      phase = turn.phase
      continue
    }

    if (!turn.is_question) {
      lastAnswer = turn.speech
      phase = turn.phase
      continue
    }

    lastAnswer =
      turn.phase === 'warmup'
        ? 'I am doing well and ready.'
        : turn.phase === 'self_intro'
          ? 'I am a fresher. I built a campus portal in React and TypeScript with auth and dashboards.'
          : 'I would clarify requirements, outline tradeoffs, then walk through complexity with a campus project example.'
    phase = turn.phase
  }

  return phases
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const browserClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const health = await fetch(`${BASE}/api/health`).catch(() => null)
  if (!health || !health.ok) throw new Error(`Dev server not reachable at ${BASE}`)

  const results: Array<{ name: string; ok: boolean; detail: string }> = []

  for (const mode of MODES) {
    console.log(`\n=== Script ${mode.label} (${mode.interviewMode}) ===`)
    const seeded = await seedUser(admin, mode.label)
    const { data: session, error: signErr } = await browserClient.auth.signInWithPassword({
      email: seeded.email,
      password: seeded.password,
    })
    if (signErr || !session.session) throw new Error(`signIn: ${signErr?.message}`)
    const cookie = cookieHeader(url, session.session)
    const { interviewId, scriptType } = await startInterview(cookie, seeded.resumeId, mode)
    console.log(`  interviewId=${interviewId} scriptType=${scriptType}`)

    const phases = await drive(cookie, interviewId, mode.label)
    const seq = phases.join('>')
    const capFails = assertPhaseCaps(phases)
    const scriptOk = scriptType === mode.expectScript || scriptType.includes(mode.expectScript)
    const ok = capFails.length === 0 && scriptOk && phases[phases.length - 1] === 'closing'
    const detail = `script=${scriptType} seq=${seq}${capFails.length ? ` fails=${capFails.join(';')}` : ''}`
    console.log(`  RESULT ${mode.label}: ${ok ? 'PASS' : 'FAIL'} — ${detail}`)
    results.push({ name: mode.label, ok, detail })
  }

  console.log('\n========== SUMMARY ==========')
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`)
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1
  else console.log('\nAll phase-transition traces passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
