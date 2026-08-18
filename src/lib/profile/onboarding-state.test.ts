import { describe, expect, it } from 'vitest';
import {
  mergeCandidateProfileJson,
  resolveProfileOnboarding,
  shouldTrackOnboardingStarted,
  shouldTrackOnboardingStepCompleted,
  didProfileCompletionChange,
  withProfileOnboardingMetadata,
} from './onboarding-state';
import { profileToStorage } from '@/lib/candidate/candidate-profile';

const completeProfile = {
  preferred_role: 'Backend Developer',
  experience_level: 'junior',
};

describe('resolveProfileOnboarding', () => {
  it('detects a true first-time account without relying on client state', () => {
    const result = resolveProfileOnboarding({
      name: 'User',
      candidateProfile: {},
      hasActiveResume: false,
      hasInterviewHistory: false,
    });

    expect(result.state).toBe('first_time');
    expect(result.shouldRedirectToWelcome).toBe(true);
    expect(result.firstMissingStep).toBe(1);
    expect(result.completionPercentage).toBe(0);
  });

  it('bypasses legacy users with explicit role and experience without faking completion', () => {
    const result = resolveProfileOnboarding({
      name: 'Rakesh Kumar',
      candidateProfile: completeProfile,
      hasActiveResume: false,
      hasInterviewHistory: false,
    });

    expect(result.state).toBe('established_bypass');
    expect(result.shouldRedirectToWelcome).toBe(false);
    expect(result.completionPercentage).toBe(75);
    expect(result.missingFields).toEqual(['resume']);
    expect(result.firstMissingStep).toBe(3);
  });

  it('detects established incomplete users from interview history', () => {
    const result = resolveProfileOnboarding({
      name: 'Rakesh Kumar',
      candidateProfile: {},
      hasActiveResume: false,
      hasInterviewHistory: true,
    });

    expect(result.state).toBe('incomplete');
    expect(result.completionPercentage).toBe(25);
    expect(result.shouldRedirectToWelcome).toBe(false);
  });

  it('reports complete only when all four canonical fields exist', () => {
    const result = resolveProfileOnboarding({
      name: 'Rakesh Kumar',
      candidateProfile: completeProfile,
      hasActiveResume: true,
      hasInterviewHistory: false,
    });

    expect(result.state).toBe('complete');
    expect(result.completionPercentage).toBe(100);
    expect(result.missingFields).toEqual([]);
  });

  it('resumes at the first missing step after saved progress', () => {
    const result = resolveProfileOnboarding({
      name: 'Rakesh Kumar',
      candidateProfile: withProfileOnboardingMetadata(completeProfile, {
        version: 1,
        started_at: '2026-08-16T10:00:00.000Z',
        current_step: 3,
        highest_step_completed: 2,
      }),
      hasActiveResume: false,
      hasInterviewHistory: false,
    });

    expect(result.state).toBe('incomplete');
    expect(result.firstMissingStep).toBe(3);
  });

  it('treats completed onboarding without a resume as incomplete at 75%', () => {
    const result = resolveProfileOnboarding({
      name: 'Rakesh Kumar',
      candidateProfile: withProfileOnboardingMetadata(completeProfile, {
        version: 1,
        started_at: '2026-08-16T10:00:00.000Z',
        completed_at: '2026-08-16T10:05:00.000Z',
        current_step: 4,
        highest_step_completed: 4,
      }),
      hasActiveResume: false,
      hasInterviewHistory: false,
    });

    expect(result.state).toBe('incomplete');
    expect(result.completionPercentage).toBe(75);
  });
});

describe('candidate_profile merge preservation', () => {
  it('preserves unknown and onboarding fields while changing canonical fields', () => {
    const existing = {
      preferred_role: 'Frontend Developer',
      experience_level: 'fresher',
      custom_future_field: { enabled: true },
      onboarding: { version: 1, highest_step_completed: 2 },
    };

    const merged = mergeCandidateProfileJson(existing, {
      preferred_role: 'Backend Developer',
    });
    expect(merged).toEqual({
      ...existing,
      preferred_role: 'Backend Developer',
    });

    const stored = profileToStorage(
      {
        preferredRole: 'Product Manager',
        experienceLevel: 'mid',
        graduationYear: null,
        collegeName: '',
      },
      existing,
    );
    expect(stored.custom_future_field).toEqual({ enabled: true });
    expect(stored.onboarding).toEqual(existing.onboarding);
    expect(stored.preferred_role).toBe('Product Manager');
  });
});

describe('onboarding analytics deduplication', () => {
  const metadata = {
    version: 1 as const,
    started_at: '2026-08-16T10:00:00.000Z',
    highest_step_completed: 2 as const,
  };

  it('emits start and step events only for first progress', () => {
    expect(shouldTrackOnboardingStarted(null)).toBe(true);
    expect(shouldTrackOnboardingStarted(metadata)).toBe(false);
    expect(shouldTrackOnboardingStepCompleted(metadata, 2)).toBe(false);
    expect(shouldTrackOnboardingStepCompleted(metadata, 3)).toBe(true);
  });

  it('emits completion updates only when percentage or state changes', () => {
    expect(
      didProfileCompletionChange(
        { state: 'incomplete', completionPercentage: 75 },
        { state: 'incomplete', completionPercentage: 75 },
      ),
    ).toBe(false);
    expect(
      didProfileCompletionChange(
        { state: 'first_time', completionPercentage: 0 },
        { state: 'incomplete', completionPercentage: 0 },
      ),
    ).toBe(true);
  });
});
