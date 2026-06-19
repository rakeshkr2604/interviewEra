import { describe, expect, it, beforeEach } from 'vitest'
import {
  HttpConversationEngine,
  type ConversationApiClient,
  type AnswerApiBody,
  type AnswerApiResponse,
  type ProcessAnswerApiBody,
  type ProcessAnswerApiResponse,
  type CompleteApiResponse,
  type StaticQuestion,
} from '@/lib/voice/conversation/http-conversation-engine'
import { createTurnContext, createSessionId, type TurnContext } from '@/lib/voice/core/ids'

class FakeApi implements ConversationApiClient {
  answerCalls: AnswerApiBody[] = []
  processCalls: ProcessAnswerApiBody[] = []
  completeCalls: number = 0
  answerResponse: AnswerApiResponse = { evaluationId: 'e1', score: 7, feedback: 'good' }
  processResponse: ProcessAnswerApiResponse | null = { type: 'next_question', text: '' }
  processThrows = false
  completeResponse: CompleteApiResponse = { reportId: 'rep-1' }
  // ordering probe
  order: string[] = []

  async postAnswer(body: AnswerApiBody): Promise<AnswerApiResponse> {
    this.answerCalls.push(body)
    this.order.push('answer')
    return this.answerResponse
  }
  async postProcessAnswer(body: ProcessAnswerApiBody): Promise<ProcessAnswerApiResponse | null> {
    this.processCalls.push(body)
    this.order.push('process')
    if (this.processThrows) throw new Error('process boom')
    return this.processResponse
  }
  async postComplete(): Promise<CompleteApiResponse> {
    this.completeCalls++
    return this.completeResponse
  }
}

const QUESTIONS: StaticQuestion[] = [
  { id: '00000000-0000-0000-0000-000000000001', questionText: 'Q1', category: 'technical' },
  { id: '00000000-0000-0000-0000-000000000002', questionText: 'Q2', category: 'behavioral' },
]

function ctxFor(index: number, isFollowUp = false): TurnContext {
  return createTurnContext({
    interviewId: 'iv1',
    sessionId: createSessionId(),
    questionIndex: index,
    isFollowUp,
  })
}

function makeEngine(api: FakeApi, max = 1) {
  return new HttpConversationEngine({
    interviewId: 'iv1',
    interviewerId: 'priya',
    role: 'Frontend Engineer',
    difficulty: 'medium',
    questions: QUESTIONS,
    api,
    maxFollowUpsPerQuestion: max,
  })
}

describe('HttpConversationEngine', () => {
  let api: FakeApi
  beforeEach(() => {
    api = new FakeApi()
  })

  it('throws if constructed with no questions', () => {
    expect(() => makeEngineEmpty(api)).toThrow(/at least one question/)
  })

  it('scores via /answer using the current static question id', async () => {
    const engine = makeEngine(api)
    const score = await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'my answer' })
    expect(api.answerCalls[0].questionId).toBe(QUESTIONS[0].id)
    expect(api.answerCalls[0].answerMode).toBe('voice')
    expect(score.overallScore).toBe(7)
    expect(score.feedbackText).toBe('good')
  })

  it('runs answer + process-answer in parallel (process kicked off before answer resolves)', async () => {
    const engine = makeEngine(api)
    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    // both called; process started inside scoreAnswer
    expect(api.processCalls).toHaveLength(1)
    expect(api.answerCalls).toHaveLength(1)
    expect(api.order).toContain('process')
    expect(api.order).toContain('answer')
  })

  it('advances to the next static question when no follow-up', async () => {
    api.processResponse = { type: 'next_question', text: '' }
    const engine = makeEngine(api)
    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    const next = await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: { overallScore: 7 } })
    expect(next.done).toBe(false)
    expect(next.question).toEqual({ text: 'Q2', questionIndex: 1, isFollowUp: false })
    expect(engine.getStaticIndex()).toBe(1)
  })

  it('issues at most one follow-up per static question, in place', async () => {
    api.processResponse = { type: 'followup', text: 'Can you elaborate on scaling?' }
    const engine = makeEngine(api, 1)

    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    const followUp = await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: { overallScore: 7 } })
    expect(followUp.question).toEqual({
      text: 'Can you elaborate on scaling?',
      questionIndex: 0,
      isFollowUp: true,
    })
    expect(engine.getStaticIndex()).toBe(0) // same static question

    // Answer the follow-up — engine must now advance (budget exhausted) even
    // though process-answer still wants another follow-up.
    await engine.scoreAnswer({ ctx: ctxFor(0, true), answerText: 'b' })
    const next = await engine.resolveNextTurn({ ctx: ctxFor(0, true), lastScore: { overallScore: 7 } })
    expect(next.question).toEqual({ text: 'Q2', questionIndex: 1, isFollowUp: false })
    expect(engine.getStaticIndex()).toBe(1)
  })

  it('never follows up when budget is zero', async () => {
    api.processResponse = { type: 'followup', text: 'probe?' }
    const engine = makeEngine(api, 0)
    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    const next = await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: { overallScore: 7 } })
    expect(next.question?.isFollowUp).toBe(false)
    expect(next.question?.questionIndex).toBe(1)
  })

  it('completes after the last question and returns reportId', async () => {
    api.processResponse = { type: 'next_question', text: '' }
    const engine = makeEngine(api)
    // Q1 → Q2
    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: { overallScore: 7 } })
    // Q2 → complete
    await engine.scoreAnswer({ ctx: ctxFor(1), answerText: 'b' })
    const done = await engine.resolveNextTurn({ ctx: ctxFor(1), lastScore: { overallScore: 8 } })
    expect(done).toEqual({ done: true, reportId: 'rep-1' })
    expect(api.completeCalls).toBe(1)
  })

  it('treats process-answer failure as non-fatal (advances to next static question)', async () => {
    api.processThrows = true
    const engine = makeEngine(api)
    const score = await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    expect(score.overallScore).toBe(7) // scoring still succeeded
    const next = await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: score })
    expect(next.question).toEqual({ text: 'Q2', questionIndex: 1, isFollowUp: false })
  })

  it('maps interview_style from question category', async () => {
    const engine = makeEngine(api)
    await engine.scoreAnswer({ ctx: ctxFor(0), answerText: 'a' })
    expect(api.processCalls[0].context.interview_style).toBe('technical')
    await engine.resolveNextTurn({ ctx: ctxFor(0), lastScore: { overallScore: 7 } })
    await engine.scoreAnswer({ ctx: ctxFor(1), answerText: 'b' })
    expect(api.processCalls[1].context.interview_style).toBe('behavioral')
  })
})

function makeEngineEmpty(api: FakeApi) {
  return new HttpConversationEngine({
    interviewId: 'iv1',
    interviewerId: null,
    role: 'x',
    difficulty: 'easy',
    questions: [],
    api,
  })
}
