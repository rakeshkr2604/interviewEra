import { describe, expect, it } from 'vitest';
import {
  modeFromFocusParam,
  parseDifficultyParam,
  parseInterviewModeParam,
} from './script-start-query';

describe('script-start-query', () => {
  it('normalizes legacy HR mode tokens', () => {
    expect(parseInterviewModeParam('HR')).toBe('hr_behavioral');
    expect(parseInterviewModeParam('hr_behavioral')).toBe('hr_behavioral');
    expect(parseInterviewModeParam('technical')).toBe('technical');
    expect(parseInterviewModeParam('nope')).toBeNull();
  });

  it('parses difficulty and focus→mode hints', () => {
    expect(parseDifficultyParam('HARD')).toBe('hard');
    expect(parseDifficultyParam('x')).toBeNull();
    expect(modeFromFocusParam('technical_depth')).toBe('technical');
    expect(modeFromFocusParam('communication_clarity')).toBe('hr_behavioral');
    expect(modeFromFocusParam('resume')).toBeNull();
  });
});
