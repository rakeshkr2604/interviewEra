/**
 * Phase 1b live verification (API-driven, real LLM + DB).
 *
 *   npx tsx scripts/verify-phase1b-closing.ts
 *
 * Requires: .env.local + `npm run dev` on VERIFY_BASE_URL (default :3000).
 *
 * Checks:
 *  A) Full CQ path — at most 2 CQ invites, then closing; status=completed
 *  B) Skip CQ path — [SKIPPED] on CQ → closing; status=completed in DB
 *  C) Three completion emails — lifecycle_email_log status=sent (and Resend id if present)
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { assertE2eSupabaseTargetNotProduction } from '../src/lib/e2e/target-guard'
import { createE2eUser, destroyE2eUser } from '../src/lib/e2e/user-lifecycle'

config({ path: resolve(process.cwd(), '.env.local') })

const BASE = process.env.VERIFY_BASE_URL?.trim() || 'http://localhost:3000'
const MAX_TURNS = 40

type TurnOut = {
  speech: string
  phase: string
  is_question: boolean
  is_follow_up?: boolean
  auto_submit?: boolean
  display_question?: string | null
}

type TurnResponse = {
  turn: TurnOut
  turnIndex: number
  interviewId: string
  questionNumber?: number
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

async function seedUser(admin: SupabaseClient, label: string) {
  const overrideTo = process.env.VERIFY_EMAIL_TO?.trim() || process.env.FOUNDER_FEEDBACK_EMAIL?.trim()
  let recipientEmail: string
  if (overrideTo && overrideTo.includes('@')) {
    const [local, domain] = overrideTo.split('@')
    recipientEmail = `${local}+phase1b-${label}-${Date.now()}@${domain}`
  } else {
    recipientEmail = `phase1b-${label}-${Date.now()}@interviewera-mail.test`
  }
  const created = await createE2eUser(admin, {
    email: recipientEmail,
    userMetadata: { name: 'Phase1b Verify' },
  })
  try {
  await admin.from('users').upsert(
    {
      id: created.id,
      email: recipientEmail,
      name: 'Phase1b Verify',
      onboarding_completed: true,
      credits_remaining: 50,
      plan_tier: 'free',
    },
    { onConflict: 'id' },
  )

  const { data: resume, error: resumeErr } = await admin
    .from('resumes')
    .insert({
      user_id: created.id,
      status: 'parsed',
      parsed_data: {
        target_role: 'Software Engineer',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience_estimate: 'Fresher / student',
        projects: [{ name: 'Campus Portal', description: 'React app' }],
      },
      raw_text: 'Phase1b verify fresher resume with React and TypeScript',
    })
    .select('id')
    .single()
  if (resumeErr || !resume) throw new Error(`resume: ${resumeErr?.message}`)

  console.log(`  seeded recipient=${recipientEmail}`)
  return { userId: created.id, email: recipientEmail, password: created.password, resumeId: resume.id as string }
  } catch (err) {
    await destroyE2eUser(admin, created.id).catch((cleanupError) => {
      console.error('[verify-phase1b-closing] seed cleanup failed', cleanupError)
    })
    throw err
  }
}

async function startInterview(
  cookie: string,
  resumeId: string,
): Promise<{ interviewId: string; scriptType: string }> {
  const res = await fetch(`${BASE}/api/interview/script/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      resumeId,
      role: 'Software Engineer',
      difficulty: 'easy',
      interviewerId: 'arjun',
      goal: 'fresher_placement',
      interviewMode: 'technical',
      experienceYears: 0,
      selfIntroEnabled: false,
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
  return { interviewId: body.interviewId, scriptType: body.scriptType ?? 'SCRIPT_T' }
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
): Promise<TurnResponse> {
  const res = await fetch(`${BASE}/api/interview/script/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(args),
  })
  const body = (await res.json().catch(() => ({}))) as TurnResponse & {
    error?: string
  }
  if (!res.ok) {
    throw new Error(`script/turn ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

async function scoreAnswer(
  cookie: string,
  args: {
    interviewId: string
    turnIndex: number
    transcript: string
    displayQuestion: string
  },
): Promise<void> {
  const res = await fetch(`${BASE}/api/interview/script/answer-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      interviewId: args.interviewId,
      turnIndex: args.turnIndex,
      transcript: args.transcript,
      displayQuestion: args.displayQuestion,
      targetRole: 'Software Engineer',
      questionType: 'technical',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn(`  answer-score ${res.status} turn=${args.turnIndex}: ${body.slice(0, 120)}`)
  } else {
    console.log(`  scored turn=${args.turnIndex}`)
  }
}

async function driveUntil(
  cookie: string,
  interviewId: string,
  opts: {
    onCandidateQuestions: (ctx: {
      turn: TurnOut
      turnIndex: number
      questionNumber: number
      phase: string
    }) => Promise<'answer' | 'skip' | 'done'>
    label: string
  },
): Promise<{
  phases: string[]
  cqInvites: number
  closed: boolean
  turnCount: number
  finalPhase: string | null
  scoredTurns: number
}> {
  const phases: string[] = []
  let phase = 'warmup'
  let questionNumber = 0
  let prevTurnIndex: number | undefined
  let lastAnswer = '[NONE]'
  let cqInvites = 0
  let closed = false
  let turnCount = 0
  let finalPhase: string | null = null
  let scoredTurns = 0
  const pendingScores: Promise<void>[] = []

  for (let i = 0; i < MAX_TURNS; i++) {
    turnCount += 1
    const data = await postTurn(cookie, {
      interviewId,
      lastAnswer,
      currentPhase: phase,
      questionNumber,
      ...(prevTurnIndex != null ? { prevTurnIndex } : {}),
    })
    const turn = data.turn
    phases.push(turn.phase)
    finalPhase = turn.phase
    prevTurnIndex = data.turnIndex
    if (typeof data.questionNumber === 'number') questionNumber = data.questionNumber

    console.log(
      `  [${opts.label}] turn=${data.turnIndex} phase=${turn.phase} is_q=${turn.is_question} follow=${Boolean(turn.is_follow_up)} speech="${turn.speech.slice(0, 80)}"`,
    )

    if (turn.phase === 'closing') {
      closed = true
      break
    }

    if (turn.phase === 'candidate_questions' && turn.is_question) {
      cqInvites += 1
      const action = await opts.onCandidateQuestions({
        turn,
        turnIndex: data.turnIndex,
        questionNumber,
        phase: turn.phase,
      })
      if (action === 'skip') {
        lastAnswer = '[SKIPPED]'
        phase = turn.phase
        continue
      }
      if (action === 'done') break
      lastAnswer =
        'What does success look like for someone in this role in the first three months?'
      phase = turn.phase
      continue
    }

    // Non-question turns (acks / bridges): mirror client auto-advance
    if (!turn.is_question) {
      lastAnswer = turn.speech
      phase = turn.phase
      continue
    }

    // Warmup / core / etc. — submit a short real answer
    lastAnswer =
      turn.phase === 'warmup'
        ? 'I am doing well and ready to start.'
        : 'I would approach this by clarifying requirements, outlining tradeoffs, then walking through time and space complexity with a concrete example from a campus project.'
    phase = turn.phase

    // Mirror client: score core answers so completion email has report data
    if (turn.phase === 'core' && turn.is_question) {
      const displayQuestion =
        (typeof turn.display_question === 'string' && turn.display_question.trim()) ||
        turn.speech.slice(0, 200)
      const turnIndex = data.turnIndex
      const transcript = lastAnswer
      pendingScores.push(
        scoreAnswer(cookie, {
          interviewId,
          turnIndex,
          transcript,
          displayQuestion,
        }).then(() => {
          scoredTurns += 1
        }),
      )
    }
  }

  await Promise.all(pendingScores)
  return { phases, cqInvites, closed, turnCount, finalPhase, scoredTurns }
}

async function waitForEmailSent(
  admin: SupabaseClient,
  interviewId: string,
  cookie: string,
  timeoutMs = 180_000,
): Promise<{ sent: boolean; row: Record<string, unknown> | null }> {
  const key = `script_interview_completed:${interviewId}`
  const deadline = Date.now() + timeoutMs
  console.log(`  waiting for email key=${key}`)

  // Kick report generation once up front (can take 15–40s)
  await fetch(
    `${BASE}/api/interview/script/report?interviewId=${interviewId}&force=1`,
    { headers: { Cookie: cookie } },
  ).catch(() => null)

  while (Date.now() < deadline) {
    const { data, error } = await admin
      .from('lifecycle_email_log')
      .select('id, status, provider_message_id, error_message')
      .eq('idempotency_key', key)
      .limit(5)

    if (error) {
      console.warn(`  email log query error: ${error.message}`)
    }

    const sentRow = (data ?? []).find(
      (r) => r.status === 'sent' || Boolean(r.provider_message_id),
    )
    if (sentRow) {
      return { sent: true, row: sentRow as Record<string, unknown> }
    }

    if (data && data.length > 0) {
      console.log(`  email log interim: ${JSON.stringify(data)}`)
    }

    await fetch(
      `${BASE}/api/interview/script/report?interviewId=${interviewId}`,
      { headers: { Cookie: cookie } },
    ).catch(() => null)

    await new Promise((r) => setTimeout(r, 3_000))
  }

  const { data: anyRow } = await admin
    .from('lifecycle_email_log')
    .select('id, status, provider_message_id, error_message')
    .eq('idempotency_key', key)
    .limit(5)
  console.log('  email log rows at timeout:', JSON.stringify(anyRow))
  return { sent: false, row: null }
}

async function fetchInterviewStatus(admin: SupabaseClient, interviewId: string) {
  const { data, error } = await admin
    .from('interviews')
    .select('id, status, completed_at, current_turn_index, engine')
    .eq('id', interviewId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function main() {
  assertE2eSupabaseTargetNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const browserClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Health check
  const health = await fetch(`${BASE}/api/health`).catch(() => null)
  if (!health || !health.ok) {
    throw new Error(`Dev server not reachable at ${BASE} — start npm run dev`)
  }

  const results: Array<{ name: string; ok: boolean; detail: string }> = []

  // ── A) Full CQ path (one invite + answer → close) ─────────────────────────
  {
    const name = 'A_full_cq'
    console.log('\n=== A: full CQ path ===')
    const seeded = await seedUser(admin, 'full')
    try {
    const { data: session, error: signErr } = await browserClient.auth.signInWithPassword({
      email: seeded.email,
      password: seeded.password,
    })
    if (signErr || !session.session) throw new Error(`signIn: ${signErr?.message}`)
    const cookie = cookieHeader(url, session.session)
    const { interviewId } = await startInterview(cookie, seeded.resumeId)

    let cqAnswers = 0
    const drive = await driveUntil(cookie, interviewId, {
      label: name,
      onCandidateQuestions: async () => {
        cqAnswers += 1
        // First invite: answer once. If a 2nd invite appears, skip to force close.
        if (cqAnswers === 1) return 'answer'
        return 'skip'
      },
    })

    const row = await fetchInterviewStatus(admin, interviewId)
    const cqInviteOk = drive.cqInvites === 1
    const closedOk = drive.closed && drive.finalPhase === 'closing'
    const statusOk = row.status === 'completed'
    const ok = cqInviteOk && closedOk && statusOk
    const detail = `cqInvites=${drive.cqInvites} closed=${drive.closed} status=${row.status} turns=${drive.turnCount} phases=${drive.phases.join('>')}`
    console.log(`  RESULT A: ${ok ? 'PASS' : 'FAIL'} — ${detail}`)
    results.push({ name, ok, detail })

    // Email check for this interview (counts toward the 3)
    console.log('  waiting for completion email…')
    // Trigger report/email via API with cookie
    await fetch(`${BASE}/api/interview/script/report?interviewId=${interviewId}&force=1`, {
      headers: { Cookie: cookie },
    }).catch(() => null)
    const email = await waitForEmailSent(admin, interviewId, cookie)
    results.push({
      name: 'A_email',
      ok: email.sent,
      detail: email.sent
        ? `sent provider_message_id=${String(email.row?.provider_message_id ?? 'n/a')}`
        : 'no lifecycle_email_log status=sent within timeout',
    })
    console.log(`  RESULT A_email: ${email.sent ? 'PASS' : 'FAIL'}`)
    } finally {
      await destroyE2eUser(admin, seeded.userId).catch((cleanupError) => {
        console.error('[verify-phase1b-closing] cleanup failed', cleanupError)
      })
    }
  }

  // ── B) Skip CQ path ───────────────────────────────────────────────────────
  {
    const name = 'B_skip_cq'
    console.log('\n=== B: skip CQ path ===')
    const seeded = await seedUser(admin, 'skip')
    try {
    const { data: session, error: signErr } = await browserClient.auth.signInWithPassword({
      email: seeded.email,
      password: seeded.password,
    })
    if (signErr || !session.session) throw new Error(`signIn: ${signErr?.message}`)
    const cookie = cookieHeader(url, session.session)
    const { interviewId } = await startInterview(cookie, seeded.resumeId)

    const drive = await driveUntil(cookie, interviewId, {
      label: name,
      onCandidateQuestions: async () => 'skip',
    })

    const row = await fetchInterviewStatus(admin, interviewId)
    const ok = drive.closed && row.status === 'completed'
    const detail = `cqInvites=${drive.cqInvites} closed=${drive.closed} status=${row.status} completed_at=${row.completed_at}`
    console.log(`  RESULT B: ${ok ? 'PASS' : 'FAIL'} — ${detail}`)
    console.log(`  DB row: ${JSON.stringify(row)}`)
    results.push({ name, ok, detail })

    await fetch(`${BASE}/api/interview/script/report?interviewId=${interviewId}&force=1`, {
      headers: { Cookie: cookie },
    }).catch(() => null)
    const email = await waitForEmailSent(admin, interviewId, cookie)
    results.push({
      name: 'B_email',
      ok: email.sent,
      detail: email.sent
        ? `sent provider_message_id=${String(email.row?.provider_message_id ?? 'n/a')}`
        : 'no lifecycle_email_log status=sent within timeout',
    })
    console.log(`  RESULT B_email: ${email.sent ? 'PASS' : 'FAIL'}`)
    } finally {
      await destroyE2eUser(admin, seeded.userId).catch((cleanupError) => {
        console.error('[verify-phase1b-closing] cleanup failed', cleanupError)
      })
    }
  }

  // ── C) Third email session (full CQ again) ────────────────────────────────
  {
    const name = 'C_third_email_session'
    console.log('\n=== C: third completion email session ===')
    const seeded = await seedUser(admin, 'email3')
    try {
    const { data: session, error: signErr } = await browserClient.auth.signInWithPassword({
      email: seeded.email,
      password: seeded.password,
    })
    if (signErr || !session.session) throw new Error(`signIn: ${signErr?.message}`)
    const cookie = cookieHeader(url, session.session)
    const { interviewId } = await startInterview(cookie, seeded.resumeId)

    let cqAnswers = 0
    const drive = await driveUntil(cookie, interviewId, {
      label: name,
      onCandidateQuestions: async () => {
        cqAnswers += 1
        if (cqAnswers === 1) return 'answer'
        return 'skip'
      },
    })
    const row = await fetchInterviewStatus(admin, interviewId)
    await fetch(`${BASE}/api/interview/script/report?interviewId=${interviewId}&force=1`, {
      headers: { Cookie: cookie },
    }).catch(() => null)
    const email = await waitForEmailSent(admin, interviewId, cookie)
    const ok = drive.closed && row.status === 'completed' && email.sent
    const detail = `closed=${drive.closed} status=${row.status} emailSent=${email.sent} provider=${String(email.row?.provider_message_id ?? 'n/a')}`
    console.log(`  RESULT C: ${ok ? 'PASS' : 'FAIL'} — ${detail}`)
    results.push({ name, ok, detail })
    } finally {
      await destroyE2eUser(admin, seeded.userId).catch((cleanupError) => {
        console.error('[verify-phase1b-closing] cleanup failed', cleanupError)
      })
    }
  }

  console.log('\n========== SUMMARY ==========')
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    process.exitCode = 1
    console.error(`\n${failed.length} check(s) failed`)
  } else {
    console.log('\nAll Phase 1b live checks passed')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
