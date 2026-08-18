/**
 * Phase 6C — canonical user-facing technical-issue UX constants.
 * Keep CTA destinations and bug→technical convergence in one place.
 */

export const TECHNICAL_ISSUE_FEEDBACK_HREF = '/feedback?category=technical_issue' as const;

export const TECHNICAL_ISSUE_CATEGORY = 'technical_issue' as const;

/** Bug-path option that must converge onto the technical-issue workflow. */
export const INTERVIEW_TECHNICAL_BUG_OPTION_ID = 'interview_technical' as const;

export const INTERVIEW_TECHNICAL_BUG_OPTION_LABEL =
  'Interview technical issue (mic, audio, freeze, or session failure)' as const;

export const TECHNICAL_ISSUE_USER_LABEL = 'Interview technical issue' as const;

export function isInterviewTechnicalBugOption(optionId: string): boolean {
  return optionId === INTERVIEW_TECHNICAL_BUG_OPTION_ID;
}
