import { describe, expect, it } from 'vitest';
import {
  getInterviewRecoveryPresentation,
  selectAbandonedResumeEligibleInterview,
  selectPrimaryRecoveryInterview,
} from './interview-recovery-ui';

describe('getInterviewRecoveryPresentation', () => {
  it('active pending/in_progress → In progress + Continue interview', () => {
    expect(getInterviewRecoveryPresentation({ status: 'in_progress' })).toEqual({
      badge: 'In progress',
      cta: 'Continue interview',
      mode: 'continue',
    });
    expect(getInterviewRecoveryPresentation({ status: 'pending' })).toEqual({
      badge: 'In progress',
      cta: 'Continue interview',
      mode: 'continue',
    });
  });

  it('abandoned eligible → Incomplete + Resume interview', () => {
    expect(
      getInterviewRecoveryPresentation({
        status: 'abandoned',
        creditDeducted: true,
        abandonedResumeUsed: false,
      }),
    ).toEqual({
      badge: 'Incomplete',
      cta: 'Resume interview',
      mode: 'resume',
    });
  });

  it('abandoned resume-used → Ended + no CTA', () => {
    expect(
      getInterviewRecoveryPresentation({
        status: 'abandoned',
        creditDeducted: true,
        abandonedResumeUsed: true,
      }),
    ).toEqual({ badge: 'Ended', cta: null, mode: 'none' });
  });

  it('abandoned no-credit → Ended + no CTA', () => {
    expect(
      getInterviewRecoveryPresentation({
        status: 'abandoned',
        creditDeducted: false,
        abandonedResumeUsed: false,
      }),
    ).toEqual({ badge: 'Ended', cta: null, mode: 'none' });
  });

  it('completed → Completed + View report when report href exists', () => {
    expect(
      getInterviewRecoveryPresentation({ status: 'completed', hasReportHref: true }),
    ).toEqual({
      badge: 'Completed',
      cta: 'View report',
      mode: 'report',
    });
    expect(
      getInterviewRecoveryPresentation({ status: 'completed', hasReportHref: false }),
    ).toEqual({
      badge: 'Completed',
      cta: null,
      mode: 'none',
    });
  });
});

describe('selectPrimaryRecoveryInterview', () => {
  const rows = [
    {
      id: 'a1',
      role: 'Old abandoned eligible',
      status: 'abandoned',
      credit_deducted: true,
      abandoned_resume_used: false,
    },
    {
      id: 'active',
      role: 'Live',
      status: 'in_progress',
      credit_deducted: true,
      abandoned_resume_used: false,
    },
    {
      id: 'a2',
      role: 'Newer abandoned eligible',
      status: 'abandoned',
      credit_deducted: true,
      abandoned_resume_used: false,
    },
  ];

  it('prefers active over abandoned when both present (list order)', () => {
    const pick = selectPrimaryRecoveryInterview(rows);
    expect(pick?.row.id).toBe('active');
    expect(pick?.mode).toBe('continue');
  });

  it('selects first abandoned-eligible when no active (newest-first caller order)', () => {
    const abandonedOnly = rows.filter((r) => r.status === 'abandoned');
    const pick = selectPrimaryRecoveryInterview(abandonedOnly);
    expect(pick?.row.id).toBe('a1');
    expect(pick?.mode).toBe('resume');
  });

  it('skips ineligible abandoned rows', () => {
    const pick = selectPrimaryRecoveryInterview([
      {
        id: 'used',
        role: 'Used',
        status: 'abandoned',
        credit_deducted: true,
        abandoned_resume_used: true,
      },
      {
        id: 'nocredit',
        role: 'No credit',
        status: 'abandoned',
        credit_deducted: false,
        abandoned_resume_used: false,
      },
      {
        id: 'ok',
        role: 'OK',
        status: 'abandoned',
        credit_deducted: true,
        abandoned_resume_used: false,
      },
    ]);
    expect(pick?.row.id).toBe('ok');
  });
});

describe('selectAbandonedResumeEligibleInterview', () => {
  it('returns null when only active sessions exist', () => {
    expect(
      selectAbandonedResumeEligibleInterview([
        { id: '1', role: 'R', status: 'in_progress', credit_deducted: true },
      ]),
    ).toBeNull();
  });
});
