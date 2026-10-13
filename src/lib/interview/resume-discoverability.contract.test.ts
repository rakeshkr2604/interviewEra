import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
}

describe('Phase 1 resume discoverability contracts', () => {
  it('RecentInterviews uses recovery presentation labels and resume API for abandoned', () => {
    const src = read('src/components/dashboard/RecentInterviews.tsx');
    expect(src).toContain('getInterviewRecoveryPresentation');
    expect(src).toContain('Continue interview');
    expect(src).toContain('Resume interview');
    expect(src).toContain('View report');
    expect(src).toContain('requestInterviewResume');
  });

  it('dashboard hero uses fetchPrimaryRecoveryInterview (not recent-list window)', () => {
    const page = read('src/app/(dashboard)/dashboard/page.tsx');
    const body = read('src/app/(dashboard)/dashboard/DashboardPageBody.tsx');
    const loader = read('src/lib/dashboard/load-dashboard-page-data.ts');
    const card = read('src/components/dashboard/UserSummaryCard.tsx');
    const cta = read('src/components/dashboard/DashboardRecoveryCta.tsx');
    const fetchSrc = read('src/lib/interview/fetch-primary-recovery-interview.ts');
    expect(loader).toContain('fetchPrimaryRecoveryInterview');
    expect(body).toContain('loadDashboardPageData');
    expect(page).toContain('DashboardPageBody');
    expect(body).not.toContain('selectPrimaryRecoveryInterview');
    expect(body).toContain('recoveryInterview');
    expect(card).toContain('DashboardRecoveryCta');
    expect(cta).toContain('requestInterviewResume');
    expect(cta).toContain('Continue interview');
    expect(cta).toContain('Resume interview');
    expect(fetchSrc).toContain(".eq('engine', 'v2.1')");
    expect(fetchSrc).toContain(".eq('credit_deducted', true)");
    expect(fetchSrc).toContain(".eq('abandoned_resume_used', false)");
    expect(fetchSrc).toContain('.limit(1)');
  });

  it('History CTAs distinguish Continue vs Resume interview', () => {
    const src = read('src/app/(dashboard)/history/HistoryListClient.tsx');
    expect(src).toContain('getInterviewRecoveryPresentation');
    expect(src).toContain('Continue interview');
    expect(src).toContain('Resume interview');
    expect(src).toContain('requestInterviewResume');
  });

  it('snapshot recovery fields do not come from the interviews limit-20 prefetch alone', () => {
    const snap = read('src/lib/candidate/load-snapshot.ts');
    expect(snap).toContain('fetchPrimaryRecoveryInterview');
    expect(snap).toContain('recoveryTarget');
    expect(snap).not.toContain('selectAbandonedResumeEligibleInterview');
  });

  it('notifications cover abandoned eligible via resumeInterviewId (no email)', () => {
    const notes = read('src/lib/candidate/notifications.ts');
    expect(notes).toContain('abandonedResumeInterviewId');
    expect(notes).toContain('Your interview is still available');
    expect(notes).toContain('resumeInterviewId');
    expect(notes).not.toContain('resend');
    expect(notes).not.toContain('sendEmail');
  });

  it('does not alter exit modal abandon path or nav-guard abandon policy', () => {
    const exit = read('src/components/interview/InterviewExitFeedbackModal.tsx');
    const guard = read('src/components/interview/active-interview-nav-guard.tsx');
    expect(exit).toContain('/api/interview/exit-feedback');
    expect(exit).toMatch(/\/api\/interview\/\$\{interviewId\}\/abandon/);
    expect(guard).not.toMatch(/\/api\/interview\/.*\/abandon/);
    expect(guard).not.toContain('interview_abandoned');
  });

  it('does not modify stale threshold or abandon-stale cron', () => {
    const policy = read('src/lib/interview/active-interview-policy.ts');
    const cron = read('src/app/api/cron/abandon-stale-interviews/route.ts');
    expect(policy).toContain('45 * 60 * 1000');
    expect(cron).toContain('abandonStaleActiveInterviews');
  });
});
