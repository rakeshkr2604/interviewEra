import { test, expect } from '@playwright/test';

/**
 * Interview API resilience guards — complements vitest coverage in
 * `voice-recovery.test.ts` (draft reconcile) and `deduplicate-questions.test.ts`.
 */
test.describe('Interview API resilience', () => {
  test('prepare endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/00000000-0000-4000-8000-000000000002/prepare');
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

  test('process-answer endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/process-answer', {
      data: {
        interview_id: '00000000-0000-4000-8000-000000000002',
        question: 'Tell me about your project.',
        answer: 'I built a React dashboard.',
        context: { role: 'Software Engineer', difficulty: 'medium', interview_style: 'mixed', focus_areas: [] },
      },
    });
    expect(res.status()).toBe(401);
  });

  test('report generate endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/report/generate', {
      data: { interviewId: '00000000-0000-4000-8000-000000000002' },
    });
    expect(res.status()).toBe(401);
  });
});
