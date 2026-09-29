import { test, expect } from '@playwright/test';

/**
 * Interview API resilience guards — complements vitest coverage.
 * V1 prepare/process-answer routes removed; auth-gate script + legacy-compatible paths.
 */
test.describe('Interview API resilience', () => {
  test('script turn endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/script/turn', {
      data: { interviewId: '00000000-0000-4000-8000-000000000002' },
    });
    expect(res.status()).toBe(401);
  });

  test('answer endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/answer', {
      data: {
        interviewId: '00000000-0000-4000-8000-000000000002',
        questionId: '00000000-0000-4000-8000-000000000010',
        answerText: 'Sample answer for auth guard.',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('legacy session GET returns gone or unauthorized', async ({ request }) => {
    const res = await request.get('/api/interview/00000000-0000-4000-8000-000000000002');
    // Unauthenticated may hit 401 via middleware/auth before 410.
    expect([401, 410]).toContain(res.status());
  });

  test('report generate endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/report/generate', {
      data: { interviewId: '00000000-0000-4000-8000-000000000002' },
    });
    expect(res.status()).toBe(401);
  });
});
