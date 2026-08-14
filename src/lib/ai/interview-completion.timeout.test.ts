import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/openrouter/client', () => ({
  createOpenRouterClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/ai/chat-completion-core', () => ({
  completionWithRetries: vi.fn(),
  modelPrefersPlainJson: vi.fn(() => false),
  DEFAULT_ATTEMPT_TIMEOUT_MS: 20_000,
}))

vi.mock('@/lib/ai/provider-health', () => ({
  recordModelSuccess: vi.fn(),
  recordModelFailure: vi.fn(),
}))

vi.mock('@/lib/ai/provider-intelligence', () => ({
  recordProviderOutcome: vi.fn(),
}))

vi.mock('@/lib/ai/request-budget-engine', () => ({
  createRequestBudget: vi.fn(() => ({})),
  canAttemptProvider: vi.fn(() => ({ allowed: true })),
  recordBudgetAttempt: vi.fn(),
}))

vi.mock('@/lib/ai/openrouter-model-router', () => ({
  getOpenRouterModelForOperation: vi.fn(() => 'openai/gpt-4.1-mini'),
}))

vi.mock('@/lib/ai/operation-registry', () => ({
  getLlmAttemptTimeoutMs: vi.fn(() => 13_000),
  listOperations: vi.fn(() => ['answer_score']),
}))

vi.mock('@/lib/telemetry/structured-ai-log', () => ({
  logInterviewAiCompletion: vi.fn(),
}))

import { completionWithRetries } from '@/lib/ai/chat-completion-core'
import { completeInterviewChat } from '@/lib/ai/interview-completion'

describe('completeInterviewChat timeout handling', () => {
  beforeEach(() => {
    vi.mocked(completionWithRetries).mockReset()
  })

  it('does not start a plain-JSON fallback after an attempt timeout', async () => {
    vi.mocked(completionWithRetries).mockRejectedValueOnce(
      new Error('Completion timeout after 13000ms'),
    )

    await expect(
      completeInterviewChat({
        messages: [{ role: 'user', content: 'score this' }],
        temperature: 0.2,
        operation: 'answer_score',
        jsonMode: true,
        maxTokens: 600,
      }),
    ).rejects.toThrow(/timeout/i)

    expect(completionWithRetries).toHaveBeenCalledTimes(1)
  })

  it('still attempts plain-JSON fallback for non-timeout JSON mode failures', async () => {
    vi.mocked(completionWithRetries)
      .mockRejectedValueOnce(new Error('response_format not supported'))
      .mockResolvedValueOnce({
        content: '{"ok":true}',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      })

    const result = await completeInterviewChat({
      messages: [{ role: 'user', content: 'score this' }],
      temperature: 0.2,
      operation: 'answer_score',
      jsonMode: true,
      maxTokens: 600,
    })

    expect(result.content).toBe('{"ok":true}')
    expect(completionWithRetries).toHaveBeenCalledTimes(2)
    expect(vi.mocked(completionWithRetries).mock.calls[0]?.[4]).toBe(true)
    expect(vi.mocked(completionWithRetries).mock.calls[1]?.[4]).toBe(false)
  })
})
