import { describe, expect, it } from 'vitest';
import { INTERVIEW_REMINDERS_SETTINGS_DESCRIPTION } from './interview-reminders-copy';

describe('INTERVIEW_REMINDERS_SETTINGS_DESCRIPTION', () => {
  it('mentions unfinished-interview recovery and practice sessions', () => {
    expect(INTERVIEW_REMINDERS_SETTINGS_DESCRIPTION).toMatch(/unfinished/i);
    expect(INTERVIEW_REMINDERS_SETTINGS_DESCRIPTION).toMatch(/in-progress/i);
    expect(INTERVIEW_REMINDERS_SETTINGS_DESCRIPTION).not.toMatch(/marketing/i);
  });
});
