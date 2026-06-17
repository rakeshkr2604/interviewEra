import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { ProgressTracker } from './components/ProgressTracker';
import { CTAButton } from './components/CTAButton';

interface VerificationEmailProps {
  name?: string;
  verificationUrl?: string;
}

export default function VerificationEmail({
  name = 'there',
  verificationUrl = 'https://interviewera.com/auth/verify',
}: VerificationEmailProps) {
  return (
    <EmailLayout
      previewText="Confirm your email address to secure your account and access InterviewEra."
    >
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#1f2937',
        margin: '0 0 16px 0',
      }} className="text-primary">
        Hi {name && name.toLowerCase() !== 'there' ? `${name} 👋` : 'there 👋'},
      </p>

      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#4b5563',
        margin: '0 0 24px 0',
      }} className="text-secondary">
        Verify your email address to complete your account setup and unlock your dashboard.
      </p>

      {/* Progress Indicator */}
      <ProgressTracker currentStep="signup" />

      {/* Primary CTA */}
      <CTAButton
        href={verificationUrl}
        reassurance="Usually takes less than 30 seconds."
      >
        Verify My Email
      </CTAButton>

      {/* Expiration warning */}
      <p style={{
        fontSize: '13px',
        lineHeight: '20px',
        color: '#71717a',
        margin: '24px 0 0 0',
        textAlign: 'center',
      }} className="text-secondary">
        This link expires in <strong>24 hours</strong>. If you did not sign up for an account, you can safely ignore this email.
      </p>

      {/* Fallback URL */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '20px',
        marginTop: '32px',
      }} className="divider">
        <p style={{
          fontSize: '11px',
          lineHeight: '16px',
          color: '#a1a1aa',
          margin: 0,
          textAlign: 'center',
        }} className="text-secondary">
          If the button above doesn't work, copy and paste this URL into your browser:
          <br />
          <a href={verificationUrl} style={{ color: '#7c3aed', textDecoration: 'none', wordBreak: 'break-all' }}>
            {verificationUrl}
          </a>
        </p>
      </div>
    </EmailLayout>
  );
}
