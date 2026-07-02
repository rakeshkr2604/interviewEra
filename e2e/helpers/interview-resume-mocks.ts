import { expect, type Page } from '@playwright/test';

export const MOCK_INTERVIEW_ID = '00000000-0000-4000-8000-00000000e2e1';

export const Q3_QUESTION_TEXT = 'How do you handle conflict?';
export const Q3_TRANSCRIPT_PATTERN = /I led a migration project/;

export const mockResumePayload = {
  interviewId: MOCK_INTERVIEW_ID,
  status: 'in_progress',
  preparing: false,
  phase: 'interview_ready',
  interviewerId: 'priya',
  role: 'Software Engineer',
  difficulty: 'intermediate',
  answeredCount: 2,
  currentQuestionIndex: 2,
  isResume: true,
  resumeSnapshot: {
    version: 1 as const,
    questionIndex: 2,
    phase: 'candidate_answering' as const,
    transcript: 'I led a migration project…',
    timerRemaining: 45,
    timerBudget: 60,
    skipCount: 1,
    pendingFollowUp: null,
    inputMode: 'text' as const,
    followUpForIndex: -1,
    updatedAt: new Date().toISOString(),
  },
  submittedAnswers: [
    {
      questionId: 'q1',
      orderIndex: 0,
      transcript: 'First answer text',
      durationSeconds: 30,
      submittedAt: new Date().toISOString(),
    },
    {
      questionId: 'q2',
      orderIndex: 1,
      transcript: 'Second answer text',
      durationSeconds: 28,
      submittedAt: new Date().toISOString(),
    },
  ],
  conversation: null,
  questions: [
    {
      id: 'q1',
      order: 0,
      question_text: 'Tell me about yourself.',
      category: 'behavioral',
      rubric: { ideal_keywords: [], ideal_structure: '', red_flags: [] },
      timeLimit: 60,
    },
    {
      id: 'q2',
      order: 1,
      question_text: 'Describe a challenging project.',
      category: 'behavioral',
      rubric: { ideal_keywords: [], ideal_structure: '', red_flags: [] },
      timeLimit: 60,
    },
    {
      id: 'q3',
      order: 2,
      question_text: Q3_QUESTION_TEXT,
      category: 'behavioral',
      rubric: { ideal_keywords: [], ideal_structure: '', red_flags: [] },
      timeLimit: 60,
    },
  ],
};

export type ResumeCheckpointStore = {
  resumeSnapshot: (typeof mockResumePayload)['resumeSnapshot'];
};

export function buildMockGetPayload(store: ResumeCheckpointStore) {
  return {
    ...mockResumePayload,
    resumeSnapshot: store.resumeSnapshot,
    currentQuestionIndex: store.resumeSnapshot.questionIndex,
  };
}

export async function installResumeRoutes(page: Page, store: ResumeCheckpointStore) {
  const interviewPattern = `**/api/interview/${MOCK_INTERVIEW_ID}`;
  const checkpointPattern = `**/api/interview/${MOCK_INTERVIEW_ID}/checkpoint`;

  await page.route(interviewPattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMockGetPayload(store)),
      });
      return;
    }
    await route.continue();
  });

  await page.route(checkpointPattern, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Omit<
        (typeof mockResumePayload)['resumeSnapshot'],
        'version' | 'updatedAt'
      >;
      store.resumeSnapshot = {
        version: 1,
        ...body,
        updatedAt: new Date().toISOString(),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, updatedAt: store.resumeSnapshot.updatedAt }),
      });
      return;
    }
    await route.continue();
  });
}

export async function expectResumedQuestionThree(page: Page) {
  await expect(page.getByText(Q3_QUESTION_TEXT)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('textarea').first()).toHaveValue(Q3_TRANSCRIPT_PATTERN, {
    timeout: 15_000,
  });
}

export function clearInterviewDraftInitScript() {
  return () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ie-interview-draft:'))
      .forEach((k) => localStorage.removeItem(k));
  };
}
