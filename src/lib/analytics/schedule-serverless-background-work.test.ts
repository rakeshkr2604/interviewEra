import { describe, expect, it, vi } from 'vitest';

const afterMock = vi.fn((task: () => void) => {
  task();
});

vi.mock('next/server', () => ({
  after: (task: () => void) => afterMock(task),
}));

import { scheduleServerlessBackgroundWork } from '@/lib/analytics/schedule-serverless-background-work';

describe('scheduleServerlessBackgroundWork', () => {
  it('registers work through Next.js after()', async () => {
    afterMock.mockClear();
    const task = vi.fn(async () => {});

    scheduleServerlessBackgroundWork(task);

    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
