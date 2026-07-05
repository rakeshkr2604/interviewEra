import { describe, expect, it } from 'vitest';
import { isResumableInterviewStatus, isTerminalInterviewStatus } from './interview-status';

// Regression: abandoned interviews were offered as "Continue" in History /
// Recent Interviews and the session page ran them, while the server rejected
// every write (checkpoint 409, answer 400 "Interview is not in progress") —
// the candidate's spoken answers were silently lost.
describe('interview-status', () => {
  it('treats only pending/in_progress as resumable', () => {
    expect(isResumableInterviewStatus('pending')).toBe(true);
    expect(isResumableInterviewStatus('in_progress')).toBe(true);
    expect(isResumableInterviewStatus('completed')).toBe(false);
    expect(isResumableInterviewStatus('abandoned')).toBe(false);
    expect(isResumableInterviewStatus(undefined)).toBe(false);
    expect(isResumableInterviewStatus(null)).toBe(false);
  });

  it('treats completed/abandoned as terminal', () => {
    expect(isTerminalInterviewStatus('completed')).toBe(true);
    expect(isTerminalInterviewStatus('abandoned')).toBe(true);
    expect(isTerminalInterviewStatus('pending')).toBe(false);
    expect(isTerminalInterviewStatus('in_progress')).toBe(false);
    expect(isTerminalInterviewStatus(undefined)).toBe(false);
  });

  it('never lets a status be both resumable and terminal', () => {
    for (const status of ['pending', 'in_progress', 'completed', 'abandoned']) {
      expect(isResumableInterviewStatus(status) && isTerminalInterviewStatus(status)).toBe(false);
    }
  });
});
