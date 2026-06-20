import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { CTAButton } from './components/CTAButton';
import { Divider } from './components/Divider';
import { FeatureCard, FeatureGrid, ProductPreview } from './components/FeatureCard';

export interface ProductUpdateEmailProps {
  name?: string;
  creditsAdded?: number;
  dashboardUrl?: string;
  interviewUrl?: string;
  feedbackUrl?: string;
  previewImageUrl?: string;
  showPreviewImage?: boolean;
  unsubscribeUrl?: string;
}

const defaultProps: Required<Omit<ProductUpdateEmailProps, 'previewImageUrl' | 'showPreviewImage'>> & {
  previewImageUrl: string;
  showPreviewImage: boolean;
} = {
  name: 'there',
  creditsAdded: 3,
  dashboardUrl: 'https://interviewera.com/dashboard',
  interviewUrl: 'https://interviewera.com/dashboard',
  feedbackUrl: 'https://interviewera.com/feedback',
  previewImageUrl: 'https://interviewera.com/blog/react-interview-hero.webp',
  showPreviewImage: true,
  unsubscribeUrl: 'https://interviewera.com/settings',
};

export default function ProductUpdateEmail(props: Partial<ProductUpdateEmailProps> = {}) {
  const {
    name,
    creditsAdded,
    interviewUrl,
    feedbackUrl,
    previewImageUrl,
    showPreviewImage,
    unsubscribeUrl,
  } = { ...defaultProps, ...props };

  const greeting =
    name && name.toLowerCase() !== 'there' ? `Hi ${name} 👋` : 'Hi there 👋';

  return (
    <EmailLayout
      previewText="InterviewEra product update: your account now includes 3 interview credits. Smarter AI, bilingual support, and camera mode — see what's new."
      unsubscribeUrl={unsubscribeUrl}
      footerTagline="Built with ❤️ to help you crack your next interview."
    >
      <p
        style={{
          fontSize: '15px',
          lineHeight: '22px',
          color: '#1f2937',
          margin: '0 0 16px 0',
        }}
        className="text-primary"
      >
        {greeting}
      </p>

      {/* Hero — credits + evolution + action */}
      <table
        border={0}
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{
          marginBottom: '0',
          backgroundColor: '#f5f3ff',
          border: '1px solid #ddd6fe',
          borderRadius: showPreviewImage ? '10px 10px 0 0' : '10px',
        }}
        className="credits-badge"
      >
        <tr>
          <td style={{ padding: '20px 20px 18px 20px' }}>
            <p
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 8px 0',
              }}
            >
              Product update · 100+ early users
            </p>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: '800',
                lineHeight: '28px',
                color: '#111827',
                margin: '0 0 10px 0',
                letterSpacing: '-0.025em',
              }}
              className="text-primary"
            >
              InterviewEra has evolved — your interview credits have been updated
            </h1>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '21px',
                color: '#4b5563',
                margin: '0 0 8px 0',
              }}
              className="text-secondary"
            >
              We&apos;ve now grown to 100+ early users. To help you experience the latest
              improvements, every existing user&apos;s account now includes {creditsAdded}{' '}
              interview credits.
            </p>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '21px',
                color: '#4b5563',
                margin: '0 0 8px 0',
              }}
              className="text-secondary"
            >
              Smarter AI follow-ups. Hindi + English support. Camera mode. Richer reports.
            </p>
            <p
              style={{
                fontSize: '14px',
                lineHeight: '21px',
                color: '#111827',
                fontWeight: '600',
                margin: 0,
              }}
              className="text-primary"
            >
              Sign in and start your next mock interview — it takes about 15 minutes.
            </p>
          </td>
        </tr>
      </table>

      {showPreviewImage && previewImageUrl ? (
        <ProductPreview
          href={interviewUrl}
          imageUrl={previewImageUrl}
          alt="InterviewEra AI mock interview experience"
          caption="✨ A smarter, faster and more realistic AI interview experience."
        />
      ) : null}

      <Divider />

      <p
        style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: '0 0 14px 0',
        }}
        className="text-secondary"
      >
        What you&apos;ll notice
      </p>

      <FeatureGrid>
        <FeatureCard
          icon="🤖"
          title="Smarter AI Interviewer"
          description="Natural back-and-forth with intelligent follow-ups that feel like a real interviewer—not a script."
        />
        <FeatureCard
          icon="🌐"
          title="English + Hindi AI Conversations"
          description="Answer in the language you're comfortable with. Gentle nudges toward English help you build confidence."
          isNew
        />
        <FeatureCard
          icon="📹"
          title="Real Camera Interview Mode"
          description="Practice realistic interviews while improving confidence, eye contact and body language."
          isNew
        />
        <FeatureCard
          icon="📄"
          title="Resume-Based Interview Questions"
          description="Questions drawn from your projects and skills—not generic templates everyone else gets."
        />
        <FeatureCard
          icon="📊"
          title="5-Dimension Performance Report"
          description="See where you shine and what to fix across communication, technical depth, structure, and more."
        />
        <FeatureCard
          icon="⚡"
          title="Faster & More Reliable Experience"
          description="Less waiting, smoother sessions. More time practicing, less time loading."
        />
      </FeatureGrid>

      <Divider />

      <p
        style={{
          fontSize: '14px',
          lineHeight: '22px',
          color: '#4b5563',
          margin: '0 0 20px 0',
          textAlign: 'center',
        }}
        className="text-secondary"
      >
        Much of what you see here was shaped by early user feedback — including yours.
        After you try the latest experience,{' '}
        <a
          href={`mailto:founder@interviewera.com?subject=${encodeURIComponent('InterviewEra feedback')}`}
          style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '600' }}
        >
          reply to this email
        </a>
        . I read every response personally.
      </p>

      <CTAButton
        href={interviewUrl}
        ariaLabel="Start interview practice"
        style={{ padding: '18px 28px', fontSize: '17px', marginTop: '0' }}
      >
        Start Interview Practice &rarr;
      </CTAButton>

      <table
        border={0}
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{
          marginTop: '16px',
          backgroundColor: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
        className="credits-reassurance"
      >
        <tr>
          <td style={{ padding: '16px 18px' }}>
            <p
              style={{
                fontSize: '13px',
                lineHeight: '20px',
                color: '#374151',
                margin: '0 0 6px 0',
              }}
              className="text-secondary"
            >
              ✓ Your interview credits have been updated.
            </p>
            <p
              style={{
                fontSize: '13px',
                lineHeight: '20px',
                color: '#374151',
                margin: '0 0 6px 0',
              }}
              className="text-secondary"
            >
              ✓ Every existing user&apos;s account now includes {creditsAdded} interview credits.
            </p>
            <p
              style={{
                fontSize: '13px',
                lineHeight: '20px',
                color: '#374151',
                margin: 0,
              }}
              className="text-secondary"
            >
              Simply sign in and start practicing with the latest InterviewEra.
            </p>
          </td>
        </tr>
      </table>
    </EmailLayout>
  );
}
