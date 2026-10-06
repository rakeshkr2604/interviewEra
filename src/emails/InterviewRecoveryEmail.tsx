import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { CTAButton } from './components/CTAButton';

export interface InterviewRecoveryEmailProps {
  name?: string;
  /** Role label only — never include answer text or scores. */
  roleLabel?: string;
  resumeUrl?: string;
  settingsUrl?: string;
}

export default function InterviewRecoveryEmail({
  name = 'there',
  roleLabel = 'your mock interview',
  resumeUrl = 'https://interviewera.com/dashboard',
  settingsUrl = 'https://interviewera.com/settings',
}: InterviewRecoveryEmailProps) {
  const greeting =
    name && name.toLowerCase() !== 'there' ? `Hi ${name},` : 'Hi there,';

  return (
    <EmailLayout
      previewText="Your unfinished mock interview is still available — resume when you are ready."
      unsubscribeUrl={settingsUrl}
    >
      <p
        style={{
          fontSize: '15px',
          lineHeight: '24px',
          color: '#1f2937',
          margin: '0 0 16px 0',
        }}
        className="text-primary"
      >
        {greeting}
      </p>

      <h1
        style={{
          fontSize: '22px',
          fontWeight: '800',
          lineHeight: '30px',
          color: '#111827',
          margin: '0 0 8px 0',
          letterSpacing: '-0.025em',
        }}
        className="text-primary"
      >
        Finish your unfinished interview
      </h1>

      <p
        style={{
          fontSize: '15px',
          lineHeight: '24px',
          color: '#4b5563',
          margin: '0 0 20px 0',
        }}
        className="text-secondary"
      >
        You still have one continue available for{' '}
        <strong style={{ color: '#111827' }}>{roleLabel}</strong>. Resume from
        your dashboard — no extra credit is charged for this one-time continue.
      </p>

      <div style={{ textAlign: 'center', margin: '28px 0' }}>
        <CTAButton href={resumeUrl}>Resume interview</CTAButton>
      </div>

      <p
        style={{
          fontSize: '13px',
          lineHeight: '20px',
          color: '#6b7280',
          margin: '0',
        }}
        className="text-secondary"
      >
        You can turn off interview reminders anytime in{' '}
        <a
          href={settingsUrl}
          style={{ color: '#5B21F4', textDecoration: 'underline' }}
        >
          Settings
        </a>
        .
      </p>
    </EmailLayout>
  );
}
