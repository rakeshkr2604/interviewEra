import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { CTAButton } from './components/CTAButton';
import { SecurityNotice } from './components/SecurityNotice';

interface ResetPasswordEmailProps {
  name?: string;
  resetUrl?: string;
}

export default function ResetPasswordEmail({
  name = 'there',
  resetUrl = 'https://interviewera.com/reset-password',
}: ResetPasswordEmailProps) {
  return (
    <EmailLayout
      previewText="Reset your InterviewEra account password using this secure link."
    >
      {/* Security Icon & Header Section */}
      <div style={{ textAlign: 'center', margin: '16px 0 28px 0' }}>
        <div style={{
          display: 'inline-block',
          width: '64px',
          height: '64px',
          lineHeight: '64px',
          borderRadius: '32px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          textAlign: 'center',
          marginBottom: '16px',
        }} className="security-notice">
          <span style={{ fontSize: '32px', verticalAlign: 'middle', display: 'inline-block' }} aria-hidden="true">🔒</span>
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '800',
          lineHeight: '28px',
          color: '#111827',
          margin: 0,
          letterSpacing: '-0.025em',
        }} className="text-primary">
          Reset Password Request
        </h1>
      </div>

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
        We received a request to reset the password for your <strong>InterviewEra</strong> account. Click the button below to choose a new password.
      </p>

      {/* Primary CTA */}
      <CTAButton href={resetUrl}>
        Reset My Password
      </CTAButton>

      {/* Security Notice Component */}
      <SecurityNotice expiresInMinutes={60} />

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
          <a href={resetUrl} style={{ color: '#5B21F4', textDecoration: 'none', wordBreak: 'break-all' }}>
            {resetUrl}
          </a>
        </p>
      </div>
    </EmailLayout>
  );
}
