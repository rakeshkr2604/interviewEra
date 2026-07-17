/**
 * Concurrency evidence for report claim: only one caller owns generation.
 */

import { describe, expect, it } from 'vitest';
import { claimReportGeneration } from '@/lib/interview/script-report/generate';

type Row = {
  interview_id: string;
  status: string;
  updated_at: string;
  generated_at: string;
};

describe('claimReportGeneration concurrency', () => {
  it('first insert claims; second concurrent call sees generating and waits (no second claim)', async () => {
    const store: { row: Row | null; inserts: number } = { row: null, inserts: 0 };

    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    if (!store.row) return { data: null, error: null };
                    return {
                      data: {
                        id: 'r1',
                        interview_id: store.row.interview_id,
                        overall: null,
                        dimension_averages: null,
                        score_band: null,
                        placement_signal: null,
                        scored_answer_count: 0,
                        prompt_versions: [],
                        per_question: [],
                        synthesis: null,
                        synthesis_model: null,
                        synthesis_prompt_version: null,
                        status: store.row.status,
                        generated_at: store.row.generated_at,
                        updated_at: store.row.updated_at,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          async insert(payload: Record<string, unknown>) {
            store.inserts += 1;
            if (store.row) {
              return { data: null, error: { code: '23505', message: 'duplicate' } };
            }
            store.row = {
              interview_id: String(payload.interview_id),
              status: 'generating',
              updated_at: String(payload.updated_at),
              generated_at: String(payload.generated_at),
            };
            return { data: store.row, error: null };
          },
          update() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      select() {
                        return {
                          async maybeSingle() {
                            return { data: null, error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const a = await claimReportGeneration({
      serviceClient: client as never,
      interviewId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
    });
    expect(a).toEqual({ claimed: true });
    expect(store.inserts).toBe(1);

    const b = await claimReportGeneration({
      serviceClient: client as never,
      interviewId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
    });
    // Early-read of fresh generating → pending; does not claim again.
    expect(b).toEqual({ claimed: false, pending: true });
    expect(store.inserts).toBe(1);
  });
});
