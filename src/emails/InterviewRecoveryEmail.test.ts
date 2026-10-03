import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import InterviewRecoveryEmail from '@/emails/InterviewRecoveryEmail';
import { templateRegistry } from '@/lib/email/templates';

describe('InterviewRecoveryEmail', () => {
  it('renders HTML with resume CTA and settings link', async () => {
    const html = await render(
      InterviewRecoveryEmail({
        name: 'Alex',
        roleLabel: 'Backend Engineer',
        resumeUrl: 'https://interviewera.com/dashboard',
        settingsUrl: 'https://interviewera.com/settings',
      }),
    );

    expect(html).toContain('Finish your unfinished interview');
    expect(html).toContain('Backend Engineer');
    expect(html).toContain('https://interviewera.com/dashboard');
    expect(html).toContain('https://interviewera.com/settings');
    expect(html).not.toContain('answer text');
    // Body must not include score report content (layout CSS may mention .score-card).
    expect(html).not.toContain('Overall Score');
    expect(html).not.toContain('/100');
  });

  it('registry renders subject without sensitive payload', async () => {
    const { html, subject } = await templateRegistry.render('interview_recovery', {
      name: 'Alex',
      roleLabel: 'SDE Intern',
      resumeUrl: 'https://interviewera.com/dashboard',
      settingsUrl: 'https://interviewera.com/settings',
    });
    expect(subject).toContain('SDE Intern');
    expect(html).toContain('Resume interview');
  });
});
