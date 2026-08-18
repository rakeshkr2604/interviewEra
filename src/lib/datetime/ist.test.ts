import { describe, expect, it } from 'vitest';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';

describe('formatDateTimeEnIn', () => {
  it('renders canonical UTC timestamps in IST', () => {
    expect(formatDateTimeEnIn('2026-08-16T16:12:00.000Z')).toBe(
      '16 Aug 2026, 9:42 PM',
    );
  });
});
