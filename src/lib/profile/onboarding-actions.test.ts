import { describe, expect, it } from 'vitest';
import { onboardingActionSchema } from './onboarding-actions';

describe('onboardingActionSchema', () => {
  it('accepts only the fields valid for each save step', () => {
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
        preferredRole: 'Backend Developer',
        phoneNumber: '+919876543210',
      }).success,
    ).toBe(true);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 2,
        experienceLevel: 'junior',
      }).success,
    ).toBe(true);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 3,
        resumeId: '9ece682a-5263-4e19-ae3b-7f4fad7a9ca2',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid experience values and malformed resume IDs', () => {
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 2,
        experienceLevel: 'expert',
      }).success,
    ).toBe(false);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 3,
        resumeId: 'another-users-resume',
      }).success,
    ).toBe(false);
  });

  it('rejects client-supplied identity on every strict action', () => {
    expect(
      onboardingActionSchema.safeParse({
        action: 'start',
        user_id: 'client-controlled',
      }).success,
    ).toBe(false);
    expect(
      onboardingActionSchema.safeParse({
        action: 'complete',
        resumeId: null,
        user_id: 'client-controlled',
      }).success,
    ).toBe(false);
  });

  it('keeps resume optional without allowing missing required profile fields', () => {
    expect(
      onboardingActionSchema.safeParse({
        action: 'complete',
        resumeId: null,
      }).success,
    ).toBe(true);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
      }).success,
    ).toBe(false);
  });

  it('requires a valid phone number on step 1', () => {
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
        preferredRole: 'Backend Developer',
      }).success,
    ).toBe(false);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
        preferredRole: 'Backend Developer',
        phoneNumber: 'abc',
      }).success,
    ).toBe(false);
    expect(
      onboardingActionSchema.safeParse({
        action: 'save-step',
        step: 1,
        name: 'Rakesh Kumar',
        preferredRole: 'Backend Developer',
        phoneNumber: '9876543210',
      }).success,
    ).toBe(true);
  });
});
