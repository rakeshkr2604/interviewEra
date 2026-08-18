import { describe, expect, it } from 'vitest';
import {
  formatCountdownClock,
  remainingCountdownParts,
  remainingMsFromServerClock,
} from './countdown';

describe('countdown clock', () => {
  it('formats more than 24 hours as DD : HH : MM : SS', () => {
    expect(formatCountdownClock(2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe(
      '02 : 03 : 04 : 05',
    );
    expect(remainingCountdownParts(90_000_000).showDays).toBe(true);
  });

  it('formats less than 24 hours as HH : MM : SS', () => {
    expect(formatCountdownClock(2 * 3_600_000 + 19 * 60_000 + 56_000)).toBe('02 : 19 : 56');
    expect(remainingCountdownParts(2 * 3_600_000).showDays).toBe(false);
  });

  it('uses expiresAt minus serverNow, not a duration from page load', () => {
    const expiresAt = '2026-08-18T14:00:00.000Z';
    const serverNow = '2026-08-18T12:00:00.000Z';
    const capturedAt = Date.parse('2026-08-18T12:00:05.000Z');
    const first = remainingMsFromServerClock({
      expiresAt,
      serverNow,
      clientNowMs: capturedAt,
      offsetCapturedAtMs: capturedAt,
    });
    const later = remainingMsFromServerClock({
      expiresAt,
      serverNow,
      clientNowMs: capturedAt + 60_000,
      offsetCapturedAtMs: capturedAt,
    });
    expect(first).toBe(2 * 3_600_000);
    expect(later).toBe(2 * 3_600_000 - 60_000);
  });

  it('returns zero after expiration', () => {
    expect(
      remainingMsFromServerClock({
        expiresAt: '2026-08-18T12:00:00.000Z',
        serverNow: '2026-08-18T12:00:00.000Z',
        clientNowMs: Date.parse('2026-08-18T12:00:00.000Z'),
      }),
    ).toBe(0);
  });
});
