import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveProfileOnboarding } from '@/lib/profile/onboarding-state';

const getUser = vi.fn();
const loadProfileOnboardingState = vi.fn();
const trackProductEventServer = vi.fn();
const updateEq = vi.fn();
const resumeMaybeSingle = vi.fn();

const resumeQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: resumeMaybeSingle,
};
resumeQuery.select.mockReturnValue(resumeQuery);
resumeQuery.eq.mockReturnValue(resumeQuery);

const usersQuery = {
  update: vi.fn(() => ({ eq: updateEq })),
};

const supabase = {
  auth: { getUser },
  from: vi.fn((table: string) => (table === 'resumes' ? resumeQuery : usersQuery)),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => supabase,
}));

vi.mock('@/lib/profile/load-onboarding-state', () => ({
  loadProfileOnboardingState: (...args: unknown[]) => loadProfileOnboardingState(...args),
}));

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

import { PATCH } from './route';

function loaded(candidateProfile: Record<string, unknown> = {}) {
  const resolution = resolveProfileOnboarding({
    name: 'User',
    candidateProfile,
    hasActiveResume: false,
    hasInterviewHistory: false,
  });
  return { resolution, candidateProfile, activeResume: null };
}

function request(body: unknown) {
  return new Request('http://localhost/api/account/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/account/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumeQuery.select.mockReturnValue(resumeQuery);
    resumeQuery.eq.mockReturnValue(resumeQuery);
    getUser.mockResolvedValue({ data: { user: { id: 'session-user' } } });
    loadProfileOnboardingState.mockResolvedValue(
      loaded({ custom_future_field: { keep: true } }),
    );
    updateEq.mockResolvedValue({ error: null });
  });

  it('uses server identity and preserves existing candidate_profile fields', async () => {
    const response = await PATCH(
      request({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
        preferredRole: 'Backend Developer',
      }),
    );

    expect(response.status).toBe(200);
    expect(usersQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rakesh Kumar',
        candidate_profile: expect.objectContaining({
          preferred_role: 'Backend Developer',
          custom_future_field: { keep: true },
          onboarding: expect.objectContaining({ highest_step_completed: 1 }),
        }),
      }),
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'session-user');
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'session-user' }),
    );
  });

  it('rejects client-controlled user identity', async () => {
    const response = await PATCH(
      request({ action: 'start', user_id: 'another-user' }),
    );

    expect(response.status).toBe(400);
    expect(usersQuery.update).not.toHaveBeenCalled();
  });

  it('rejects a resume not owned by the authenticated user', async () => {
    resumeMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      request({
        action: 'save-step',
        step: 3,
        resumeId: '9ece682a-5263-4e19-ae3b-7f4fad7a9ca2',
      }),
    );

    expect(response.status).toBe(403);
    expect(resumeQuery.eq).toHaveBeenCalledWith('user_id', 'session-user');
    expect(usersQuery.update).not.toHaveBeenCalled();
  });

  it('rejects a deleted resume even when it belongs to the user', async () => {
    resumeMaybeSingle.mockResolvedValue({
      data: {
        id: '9ece682a-5263-4e19-ae3b-7f4fad7a9ca2',
        status: 'parsed',
        deleted_at: '2026-08-16T10:00:00.000Z',
        storage_path: 'session-user/resume.pdf',
      },
      error: null,
    });

    const response = await PATCH(
      request({
        action: 'save-step',
        step: 3,
        resumeId: '9ece682a-5263-4e19-ae3b-7f4fad7a9ca2',
      }),
    );

    expect(response.status).toBe(400);
    expect(usersQuery.update).not.toHaveBeenCalled();
  });

  it('does not complete onboarding while required canonical fields are missing', async () => {
    const response = await PATCH(request({ action: 'complete', resumeId: null }));

    expect(response.status).toBe(400);
    expect(usersQuery.update).not.toHaveBeenCalled();
  });

  it('does not duplicate the onboarding_started event after refresh', async () => {
    loadProfileOnboardingState.mockResolvedValue(
      loaded({
        onboarding: {
          version: 1,
          started_at: '2026-08-16T10:00:00.000Z',
          current_step: 1,
          highest_step_completed: 0,
        },
      }),
    );

    const response = await PATCH(request({ action: 'start' }));

    expect(response.status).toBe(200);
    expect(trackProductEventServer).not.toHaveBeenCalled();
  });

  it('requires an authenticated session for email and OAuth users alike', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(request({ action: 'start' }));

    expect(response.status).toBe(401);
    expect(loadProfileOnboardingState).not.toHaveBeenCalled();
  });
});
