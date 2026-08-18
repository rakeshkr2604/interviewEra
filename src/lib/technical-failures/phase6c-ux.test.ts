import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import {
  formatCreditLedgerReason,
  technicalCreditRestorationLabel,
  TECHNICAL_FAILURE_STATUS_LABELS,
} from '@/lib/technical-failures/status';
import {
  INTERVIEW_TECHNICAL_BUG_OPTION_ID,
  INTERVIEW_TECHNICAL_BUG_OPTION_LABEL,
  TECHNICAL_ISSUE_CATEGORY,
  TECHNICAL_ISSUE_FEEDBACK_HREF,
  TECHNICAL_ISSUE_USER_LABEL,
  isInterviewTechnicalBugOption,
} from '@/lib/technical-failures/ux';
import { assessFeedback } from '@/lib/email/feedback-notification';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';

describe('Phase 6C technical-issue UX convergence', () => {
  it('routes TechnicalIssueProtection and Help Center to the canonical Feedback entry', () => {
    expect(TECHNICAL_ISSUE_FEEDBACK_HREF).toBe('/feedback?category=technical_issue');

    const protection = readFileSync(
      join(process.cwd(), 'src/components/pricing/TechnicalIssueProtection.tsx'),
      'utf8',
    );
    expect(protection).toContain('TECHNICAL_ISSUE_FEEDBACK_HREF');
    expect(protection).toContain('Report a technical issue');

    const help = readFileSync(
      join(process.cwd(), 'src/components/help/HelpCenterSearch.tsx'),
      'utf8',
    );
    expect(help).toContain('TECHNICAL_ISSUE_FEEDBACK_HREF');
  });

  it('converges interview technical bug options onto the technical-issue workflow', () => {
    expect(isInterviewTechnicalBugOption(INTERVIEW_TECHNICAL_BUG_OPTION_ID)).toBe(true);
    expect(isInterviewTechnicalBugOption('upload_fail')).toBe(false);
    expect(INTERVIEW_TECHNICAL_BUG_OPTION_LABEL).toContain(TECHNICAL_ISSUE_USER_LABEL);

    const form = readFileSync(
      join(process.cwd(), 'src/components/feedback/FeedbackForm.tsx'),
      'utf8',
    );
    expect(form).toContain('INTERVIEW_TECHNICAL_BUG_OPTION_ID');
    expect(form).toContain("setFeedbackCategory('technical_issue')");
    expect(form).toContain('This technical issue has already been reported.');
  });

  it('does not require star rating for technical issues and keeps rating for normal feedback', () => {
    const technical = feedbackSubmitSchema.safeParse({
      name: 'Rakesh',
      rating: null,
      likedText: '',
      confusionText: '',
      bugsText: '',
      feedbackCategory: TECHNICAL_ISSUE_CATEGORY,
      interviewId: INTERVIEW_ID,
      technicalFailureCategory: 'transcription_service_failure',
      technicalIssueDescription: 'Mic stopped capturing after question 2.',
      pageUrl: 'https://interviewera.com/feedback',
      browserInfo: 'Chrome',
    });
    expect(technical.success).toBe(true);

    const technicalWithoutScreenshot = feedbackSubmitSchema.safeParse({
      name: 'Rakesh',
      rating: null,
      likedText: '',
      confusionText: '',
      bugsText: '',
      feedbackCategory: TECHNICAL_ISSUE_CATEGORY,
      interviewId: INTERVIEW_ID,
      technicalFailureCategory: 'platform_timeout',
      technicalIssueDescription: 'Session froze mid-answer.',
      pageUrl: 'https://interviewera.com/feedback',
      browserInfo: 'Chrome',
    });
    expect(technicalWithoutScreenshot.success).toBe(true);

    const normalMissingRating = feedbackSubmitSchema.safeParse({
      name: 'Rakesh',
      rating: null,
      likedText: 'Great questions',
      confusionText: '',
      bugsText: '',
      feedbackCategory: 'interview',
      pageUrl: 'https://interviewera.com/feedback',
      browserInfo: 'Chrome',
    });
    expect(normalMissingRating.success).toBe(false);

    const normalWithRating = feedbackSubmitSchema.safeParse({
      name: 'Rakesh',
      rating: 4.5,
      likedText: 'Great questions',
      confusionText: '',
      bugsText: '',
      feedbackCategory: 'interview',
      pageUrl: 'https://interviewera.com/feedback',
      browserInfo: 'Chrome',
    });
    expect(normalWithRating.success).toBe(true);
  });

  it('labels technical issues distinctly for admin email triage', () => {
    const assessed = assessFeedback({
      name: 'Rakesh',
      email: 'rakesh@example.com',
      userId: 'user-1',
      rating: null,
      likedText: '',
      confusionText: '',
      bugsText: 'Mic failed mid interview',
      wouldUseAgain: null,
      pageUrl: 'https://interviewera.com/feedback',
      browserInfo: 'Chrome',
      screenshotUrl: null,
      sessionContext: null,
      labels: [],
      feedbackCategory: 'technical_issue',
      createdAt: new Date(),
    });
    expect(assessed.label).toBe('Interview technical issue');
    expect(assessed.severity).toBe('high');
  });

  it('exposes user/admin status and credit restoration labels', () => {
    expect(TECHNICAL_FAILURE_STATUS_LABELS.submitted).toBe('Submitted');
    expect(TECHNICAL_FAILURE_STATUS_LABELS.investigating).toBe('Investigating');
    expect(TECHNICAL_FAILURE_STATUS_LABELS.approved).toBe('Approved');
    expect(TECHNICAL_FAILURE_STATUS_LABELS.rejected).toBe('Rejected');

    expect(
      technicalCreditRestorationLabel({
        status: 'submitted',
        originalDebitPresent: true,
        restorationPresent: false,
      }),
    ).toBe('Pending');
    expect(
      technicalCreditRestorationLabel({
        status: 'approved',
        originalDebitPresent: true,
        restorationPresent: true,
      }),
    ).toBe('Restored');
    expect(
      technicalCreditRestorationLabel({
        status: 'investigating',
        originalDebitPresent: false,
        restorationPresent: false,
      }),
    ).toBe('Not eligible');
    expect(
      technicalCreditRestorationLabel({
        status: 'rejected',
        originalDebitPresent: true,
        restorationPresent: false,
      }),
    ).toBe('Not restored');

    expect(formatCreditLedgerReason('technical_failure_restore')).toBe(
      'Interview credit restored',
    );
  });

  it('keeps admin collapsed-card technical visibility contracts', () => {
    const adminPage = readFileSync(
      join(process.cwd(), 'src/app/platform/feedback/page.tsx'),
      'utf8',
    );
    expect(adminPage).toContain('Interview technical issue · ');
    expect(adminPage).toContain('Credit restoration:');
    expect(adminPage).toContain('Technical failure case ·');
    expect(adminPage).toContain(
      'Credit restoration unavailable — no verifiable interview credit debit.',
    );
    expect(adminPage).toContain('Approve technical failure and restore 1 interview credit');
    expect(adminPage).toContain('Reject technical-failure restoration');
    expect(adminPage).toContain('Grant 1 complimentary credit');
    expect(adminPage).not.toContain('window.prompt(');
  });
});
