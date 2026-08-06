import { describe, expect, it } from 'vitest';
import {
  canMoveToStage,
  isHiringStage,
  nextHiringStage,
} from '@/lib/hiring/pipeline';

describe('hiring pipeline', () => {
  it('recognizes valid stages', () => {
    expect(isHiringStage('applied')).toBe(true);
    expect(isHiringStage('unknown')).toBe(false);
  });

  it('advances along the happy path', () => {
    expect(nextHiringStage('applied')).toBe('ai_interview_completed');
    expect(nextHiringStage('ai_interview_completed')).toBe('shortlisted');
    expect(nextHiringStage('shortlisted')).toBe('human_interview');
    expect(nextHiringStage('human_interview')).toBe('offer');
    expect(nextHiringStage('offer')).toBeNull();
    expect(nextHiringStage('rejected')).toBeNull();
  });

  it('allows reject from active stages and reopen to applied', () => {
    expect(canMoveToStage('applied', 'rejected')).toBe(true);
    expect(canMoveToStage('offer', 'rejected')).toBe(false);
    expect(canMoveToStage('rejected', 'applied')).toBe(true);
  });
});
