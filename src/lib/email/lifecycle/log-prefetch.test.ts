import { describe, expect, it, vi } from 'vitest';
import { prefetchSentLifecycleKeys } from './log';

function mockLogClient(rowsByCall: { idempotency_key: string }[][]) {
  const calls: { keys: string[] }[] = [];
  const from = vi.fn(() => {
    const callIndex = calls.length;
    const chain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn((column: string, keys: string[]) => {
        expect(column).toBe('idempotency_key');
        calls.push({ keys });
        return chain;
      }),
      eq: vi.fn().mockResolvedValue({
        data: rowsByCall[callIndex] ?? [],
        error: null,
      }),
    };
    return chain;
  });
  return { from, calls };
}

describe('prefetchSentLifecycleKeys', () => {
  it('returns an empty set without querying when there are no keys', async () => {
    const client = mockLogClient([]);
    const sent = await prefetchSentLifecycleKeys([], client);
    expect(sent.size).toBe(0);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('chunks keys at 100 and keeps only status=sent rows', async () => {
    const keys = Array.from({ length: 101 }, (_, i) => `interview_recovery:i${i}:r1`);
    const client = mockLogClient([
      [{ idempotency_key: 'interview_recovery:i0:r1' }],
      [{ idempotency_key: 'interview_recovery:i100:r1' }],
    ]);
    const sent = await prefetchSentLifecycleKeys(keys, client);
    expect(client.calls).toHaveLength(2);
    expect(client.calls[0]?.keys).toHaveLength(100);
    expect(client.calls[1]?.keys).toHaveLength(1);
    expect(sent).toEqual(
      new Set(['interview_recovery:i0:r1', 'interview_recovery:i100:r1']),
    );
  });
});
