import { describe, expect, it } from 'vitest';
import { formatProgressMessage } from './format-progress-message';

describe('formatProgressMessage', () => {
  it('asks for lifetime average when tier-4 session gate is already met', () => {
    const msg = formatProgressMessage(3, {
      total_sessions: 51,
      max_dimension_score: 8,
      last_5_sessions_avg: 7,
      overall_avg_score: 6.5,
    });
    expect(msg).toMatch(/8\.0 overall lifetime average/i);
    expect(msg).toMatch(/1\.5 points to go/i);
  });

  it('does not invent a generic fallback when score gap remains', () => {
    const msg = formatProgressMessage(3, {
      total_sessions: 5,
      max_dimension_score: null,
      last_5_sessions_avg: null,
      overall_avg_score: null,
    });
    expect(msg).toMatch(/8\.0 overall lifetime average/i);
  });
});
