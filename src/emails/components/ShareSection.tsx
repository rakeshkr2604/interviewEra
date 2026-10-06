import * as React from 'react';

interface ShareSectionProps {
  enabled?: boolean;
  reportUrl: string;
  candidateName?: string;
  overallScore?: number;
  style?: React.CSSProperties;
}

export function ShareSection({ enabled = true, reportUrl, candidateName = 'there', overallScore = 80, style }: ShareSectionProps) {
  if (!enabled) return null;

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`;
  const emailMentorUrl = `mailto:?subject=${encodeURIComponent(`${candidateName}'s Mock Interview Feedback Ready`)}&body=${encodeURIComponent(`Hi,\n\nI recently completed an AI-powered mock interview on InterviewEra and scored ${overallScore}/100. Please review my granular report here: ${reportUrl}\n\nThanks!`)}`;

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        margin: '24px 0',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        ...style,
      }}
      className="share-section"
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#4b5563',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 12px 0',
        }}
        className="text-secondary"
      >
        Need feedback?
      </p>

      <table border={0} cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
        <tr>
          <td style={{ padding: '0 8px' }}>
            <a
              href={linkedinShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: '#5B21F4',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Share on LinkedIn
            </a>
          </td>
          <td style={{ padding: '0 2px', color: '#d1d5db', fontSize: '13px' }}>&bull;</td>
          <td style={{ padding: '0 8px' }}>
            <a
              href={emailMentorUrl}
              style={{
                fontSize: '13px',
                color: '#5B21F4',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Share with your mentor
            </a>
          </td>
          <td style={{ padding: '0 2px', color: '#d1d5db', fontSize: '13px' }}>&bull;</td>
          <td style={{ padding: '0 8px' }}>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: '#5B21F4',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Copy report link
            </a>
          </td>
        </tr>
      </table>
    </div>
  );
}
