import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `/api/product-events` is the client beacon sink. Historically console-only;
 * this suite locks in the new behavior: a small allowlist of recognized
 * startup-funnel milestones is additionally persisted via
 * `persistMilestoneEventOnce`, and every other beacon remains console-only
 * (unchanged).
 */

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: true }),
}));

const persistMilestoneEventOnce = vi.fn();
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}));

import { POST } from '@/app/api/product-events/route';

const IV = '11111111-1111-4111-8111-111111111111';

function req(body: unknown): Request {
  return new Request('http://localhost/api/product-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  persistMilestoneEventOnce.mockClear();
});

describe('POST /api/product-events — recognized milestones are persisted', () => {
  it('persists interview_session_opened with interviewId + runId dedupe props', async () => {
    await POST(req({ event: 'interview_session_opened', interviewId: IV, runId: 'run-1', userId: 'user-1' }));

    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_session_opened', {
      interview_id: IV,
      run_id: 'run-1',
      user_id: 'user-1',
    });
  });

  it('translates avatar_audio_started into interview_first_question_played', async () => {
    await POST(req({ event: 'avatar_audio_started', interviewId: IV, questionIndex: 2 }));

    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_first_question_played', {
      interview_id: IV,
    });
  });

  it('translates mic_permission_denied into interview_mic_blocked with reason', async () => {
    await POST(req({ event: 'mic_permission_denied', interviewId: IV, reason: 'permission_denied' }));

    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_mic_blocked', {
      interview_id: IV,
      reason: 'permission_denied',
    });
  });

  it('translates submit_blocked (empty_payload) into interview_first_answer_blocked', async () => {
    await POST(req({ event: 'submit_blocked', interviewId: IV, reason: 'empty_payload' }));

    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_first_answer_blocked', {
      interview_id: IV,
      reason: 'empty_payload',
    });
  });

  it('does NOT translate submit_blocked for non-empty_payload reasons (internal race guards)', async () => {
    await POST(req({ event: 'submit_blocked', interviewId: IV, reason: 'wrong_phase' }));

    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('translates submit_failed into interview_first_answer_blocked with http_status', async () => {
    await POST(req({ event: 'submit_failed', interviewId: IV, httpStatus: 500 }));

    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_first_answer_blocked', {
      interview_id: IV,
      reason: 'evaluation_failed',
      http_status: 500,
    });
  });
});

describe('POST /api/product-events — everything else stays console-only', () => {
  it('does not persist an unrecognized event name', async () => {
    await POST(req({ event: 'avatar_audio_completed', interviewId: IV }));

    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('does not persist a recognized event name missing interviewId (cannot dedupe/attribute)', async () => {
    await POST(req({ event: 'avatar_audio_started' }));

    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('handles a batch: only recognized entries are persisted, others are skipped', async () => {
    await POST(
      req([
        { event: 'mic_pipeline_metrics', interviewId: IV },
        { event: 'avatar_audio_started', interviewId: IV },
        { event: 'tts_playback_detected', interviewId: IV },
      ]),
    );

    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1);
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_first_question_played', {
      interview_id: IV,
    });
  });

  it('always returns 204 regardless of persistence', async () => {
    const res = await POST(req({ event: 'avatar_audio_started', interviewId: IV }));
    expect(res.status).toBe(204);
  });
});
