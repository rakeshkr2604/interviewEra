import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    rpc: rpcMock,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () =>
                  table === 'interviews'
                    ? {
                        data: {
                          id: '33333333-3333-4333-8333-333333333333',
                          status: 'in_progress',
                          engine: 'v2.1',
                          started_at: '2026-08-18T10:00:00.000Z',
                        },
                        error: null,
                      }
                    : { data: null, error: null },
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import {
  addCredit,
  createInterviewWithCredit,
  refundCredit,
} from '@/lib/utils/credits';

const input = {
  userId: '11111111-1111-4111-8111-111111111111',
  resumeId: '22222222-2222-4222-8222-222222222222',
  role: 'Backend Engineer',
  difficulty: 'medium' as const,
  questionCount: 6,
  status: 'pending' as const,
  startedAt: null,
  interviewerId: 'priya',
  sessionContext: {
    goal: 'general_practice',
    interviewMode: 'technical',
    experienceYears: 2,
    interviewerId: 'priya',
  },
};

describe('interview credit ownership helpers', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('creates an interview and returns its exact linked debit transaction', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        success: true,
        remaining: 2,
        interview_id: '33333333-3333-4333-8333-333333333333',
        credit_transaction_id: '44444444-4444-4444-8444-444444444444',
        created: true,
      }],
      error: null,
    });

    const result = await createInterviewWithCredit(input);

    expect(result).toEqual({
      success: true,
      remaining: 2,
      interviewId: '33333333-3333-4333-8333-333333333333',
      creditTransactionId: '44444444-4444-4444-8444-444444444444',
      created: true,
    });
    expect(rpcMock).toHaveBeenCalledWith('create_interview_with_credit', expect.objectContaining({
      p_user_id: input.userId,
      p_resume_id: input.resumeId,
      p_status: 'pending',
      p_session_context: input.sessionContext,
      p_engine: 'v1',
    }));
  });

  it('returns no_credits without an interview ownership result', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        success: false,
        remaining: 0,
        interview_id: null,
        credit_transaction_id: null,
        created: false,
      }],
      error: null,
    });

    await expect(createInterviewWithCredit(input)).resolves.toEqual({
      success: false,
      remaining: 0,
      reason: 'no_credits',
    });
  });

  it('returns the existing ownership when the RPC dedupes a concurrent retry', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        success: true,
        remaining: 2,
        interview_id: '33333333-3333-4333-8333-333333333333',
        credit_transaction_id: '44444444-4444-4444-8444-444444444444',
        created: false,
      }],
      error: null,
    });

    await expect(createInterviewWithCredit(input)).resolves.toMatchObject({
      interviewId: '33333333-3333-4333-8333-333333333333',
      creditTransactionId: '44444444-4444-4444-8444-444444444444',
      created: false,
    });
  });

  it('rejects an incomplete successful ownership result', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        success: true,
        remaining: 2,
        interview_id: '33333333-3333-4333-8333-333333333333',
        credit_transaction_id: null,
        created: true,
      }],
      error: null,
    });

    await expect(createInterviewWithCredit(input)).rejects.toThrow(
      'incomplete ownership data',
    );
  });

  it('surfaces an atomic RPC failure without returning an orphan interview', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'ledger insert failed' },
    });

    await expect(createInterviewWithCredit(input)).rejects.toThrow(
      'Interview creation and credit deduction failed',
    );
  });

  it('maps an active-interview RPC conflict to a typed error instead of wrapping it', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'Another interview is already active',
        hint: '33333333-3333-4333-8333-333333333333',
        details: JSON.stringify({
          interview_id: '33333333-3333-4333-8333-333333333333',
          status: 'in_progress',
          engine: 'v2.1',
          started_at: '2026-08-18T10:00:00.000Z',
        }),
      },
    });

    await expect(createInterviewWithCredit(input)).rejects.toMatchObject({
      name: 'ActiveInterviewExistsError',
      code: 'active_interview',
      interviewId: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('maps a unique-index race to the same typed conflict', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "uq_interviews_one_active_per_user"',
      },
    });

    await expect(createInterviewWithCredit(input)).rejects.toMatchObject({
      name: 'ActiveInterviewExistsError',
      interviewId: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('links start-failure refunds to the same user and interview', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await refundCredit(input.userId, '33333333-3333-4333-8333-333333333333');

    expect(rpcMock).toHaveBeenCalledWith('refund_credit', {
      p_user_id: input.userId,
      p_interview_id: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('keeps non-interview credit grants on add_credit', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await addCredit(input.userId, 1, 'Referral bonus');

    expect(rpcMock).toHaveBeenCalledWith('add_credit', {
      p_user_id: input.userId,
      p_amount: 1,
      p_reason: 'Referral bonus',
    });
  });
});
