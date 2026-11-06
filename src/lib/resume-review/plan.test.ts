import { describe, expect, it } from 'vitest';
import {
  isResumeReviewEligiblePlan,
  resumeReviewAllowanceFor,
  RESUME_REVIEW_ALLOWANCE,
} from './plan';

describe('resume-review plan eligibility', () => {
  it('only starter and pro are eligible', () => {
    expect(isResumeReviewEligiblePlan('starter')).toBe(true);
    expect(isResumeReviewEligiblePlan('pro')).toBe(true);
    expect(isResumeReviewEligiblePlan('free')).toBe(false);
    expect(isResumeReviewEligiblePlan('campus')).toBe(false);
    expect(isResumeReviewEligiblePlan('campus_admin')).toBe(false);
    expect(isResumeReviewEligiblePlan(null)).toBe(false);
    expect(isResumeReviewEligiblePlan(undefined)).toBe(false);
  });

  it('grants starter 1 and pro 2 per billing cycle', () => {
    expect(resumeReviewAllowanceFor('starter')).toBe(1);
    expect(resumeReviewAllowanceFor('pro')).toBe(2);
    expect(RESUME_REVIEW_ALLOWANCE).toEqual({ starter: 1, pro: 2 });
  });

  it('non-eligible tiers get zero allowance', () => {
    expect(resumeReviewAllowanceFor('free')).toBe(0);
    expect(resumeReviewAllowanceFor('campus')).toBe(0);
    expect(resumeReviewAllowanceFor(null)).toBe(0);
    expect(resumeReviewAllowanceFor(undefined)).toBe(0);
  });
});
