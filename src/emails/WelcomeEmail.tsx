import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { ProgressTracker } from './components/ProgressTracker';
import { InfoCard } from './components/InfoCard';
import { Checklist } from './components/Checklist';
import { CTAButton } from './components/CTAButton';

interface WelcomeEmailProps {
  name?: string;
  dashboardUrl?: string;
}

export default function WelcomeEmail({
  name = 'there',
  dashboardUrl = 'https://interviewera.com/dashboard',
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      previewText="Welcome to InterviewEra! You're ready to practice your first AI-powered mock interview."
    >
      {/* Header Info */}
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#1f2937',
        margin: '0 0 16px 0',
      }} className="text-primary">
        Hi {name && name.toLowerCase() !== 'there' ? `${name} 👋` : 'there 👋'},
      </p>

      {/* Hero Header */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: '800',
        lineHeight: '32px',
        color: '#111827',
        margin: '0 0 8px 0',
        letterSpacing: '-0.025em',
      }} className="text-primary">
        Welcome to InterviewEra
      </h1>
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#4b5563',
        margin: '0 0 24px 0',
      }} className="text-secondary">
        You're ready to practice your first AI-powered mock interview.
      </p>

      {/* Progress Indicator */}
      <ProgressTracker
        steps={[
          { label: 'Account Created', completed: true },
          { label: 'Upload Resume', completed: false },
          { label: 'Start Mock Interview', completed: false },
          { label: 'View AI Report', completed: false },
        ]}
      />

      {/* Expected Time Card */}
      <InfoCard style={{ borderLeft: '4px solid #5B21F4', backgroundColor: '#f5f3ff' }}>
        <p style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#5B21F4',
          margin: 0,
        }}>
          ⏱ Takes only 15 minutes
        </p>
      </InfoCard>

      {/* Next Steps Card */}
      <div style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        margin: '24px 0',
      }} className="info-card">
        <h3 style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#111827',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 16px 0',
        }} className="text-primary">
          Next Steps
        </h3>
        <table border={0} cellPadding={0} cellSpacing={0} width="100%">
          <tr>
            <td valign="top" style={{ paddingBottom: '16px' }}>
              <span style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: '#f5f3ff',
                color: '#5B21F4',
                textAlign: 'center',
                lineHeight: '24px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                1
              </span>
            </td>
            <td style={{ paddingLeft: '12px', paddingBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }} className="text-primary">
                Upload your resume
              </p>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }} className="text-secondary">
                We'll scan your experience and tailor the interview questions.
              </p>
            </td>
          </tr>
          <tr>
            <td valign="top" style={{ paddingBottom: '16px' }}>
              <span style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: '#f5f3ff',
                color: '#5B21F4',
                textAlign: 'center',
                lineHeight: '24px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                2
              </span>
            </td>
            <td style={{ paddingLeft: '12px', paddingBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }} className="text-primary">
                Choose your target role
              </p>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }} className="text-secondary">
                Select your industry, experience level, and company target.
              </p>
            </td>
          </tr>
          <tr>
            <td valign="top">
              <span style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: '#f5f3ff',
                color: '#5B21F4',
                textAlign: 'center',
                lineHeight: '24px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                3
              </span>
            </td>
            <td style={{ paddingLeft: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }} className="text-primary">
                Start your first mock interview
              </p>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }} className="text-secondary">
                Get real-time audio or text questions from our AI recruiter.
              </p>
            </td>
          </tr>
        </table>
      </div>

      {/* What You'll Get */}
      <Checklist
        title="What You'll Get"
        items={[
          { icon: '📄', text: 'Resume Analysis' },
          { icon: '🤖', text: 'AI Follow-up Questions' },
          { icon: '💬', text: 'Communication Feedback' },
          { icon: '🛠', text: 'Technical Feedback' },
          { icon: '📊', text: 'Detailed Interview Report' },
        ]}
      />

      {/* Primary CTA */}
      <CTAButton
        href={dashboardUrl}
        reassurance="No credit card required • Takes about 15 minutes"
      >
        Start My First Interview &rarr;
      </CTAButton>

      {/* Founder Note */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '20px',
        marginTop: '32px',
      }} className="divider">
        <p style={{
          fontSize: '14px',
          lineHeight: '22px',
          color: '#4b5563',
          margin: '0 0 12px 0',
        }} className="text-secondary">
          Thanks for joining InterviewEra. Good luck.
        </p>
        <p style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#111827',
          margin: 0,
        }} className="text-primary">
          Rakesh Kumar
        </p>
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          margin: 0,
        }} className="text-secondary">
          Founder
        </p>
      </div>
    </EmailLayout>
  );
}
