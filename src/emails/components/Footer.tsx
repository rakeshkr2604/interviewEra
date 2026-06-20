import * as React from 'react';

interface FooterProps {
  unsubscribeUrl?: string;
  tagline?: string;
}

export function Footer({ unsubscribeUrl, tagline }: FooterProps) {
  const brandPurple = '#7c3aed';
  const textMuted = '#71717a';

  return (
    <table border={0} cellPadding={0} cellSpacing={0} width="100%" style={{ marginTop: '32px' }}>
      {tagline ? (
        <tr>
          <td
            align="center"
            style={{
              fontSize: '13px',
              lineHeight: '20px',
              color: '#6b7280',
              textAlign: 'center',
              paddingBottom: '16px',
            }}
            className="footer-tagline text-secondary"
          >
            {tagline}
          </td>
        </tr>
      ) : null}
      <tr>
        <td align="center" style={{
          fontSize: '12px',
          color: textMuted,
          lineHeight: '20px',
          textAlign: 'center',
        }} className="footer-text">
          &copy; {new Date().getFullYear()} InterviewEra. All rights reserved.
          <br />
          <a href="https://interviewera.com" target="_blank" rel="noopener noreferrer" style={{ color: textMuted, textDecoration: 'none' }} className="footer-link">
            interviewera.com
          </a>
          {' '}&bull;{' '}
          <a href="mailto:support@interviewera.com" style={{ color: textMuted, textDecoration: 'none' }} className="footer-link">
            support@interviewera.com
          </a>
          <br />
          <a href="https://interviewera.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: textMuted, textDecoration: 'underline' }} className="footer-link">
            Privacy Policy
          </a>
          {' '}&bull;{' '}
          <a href="https://interviewera.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: textMuted, textDecoration: 'underline' }} className="footer-link">
            Terms
          </a>
          {unsubscribeUrl && (
            <>
              {' '}&bull;{' '}
              <a href={unsubscribeUrl} target="_blank" rel="noopener noreferrer" style={{ color: brandPurple, textDecoration: 'underline' }} className="unsubscribe-link">
                Unsubscribe
              </a>
            </>
          )}
        </td>
      </tr>
      <tr>
        <td align="center" style={{ paddingTop: '16px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }} className="footer-help-text">
          Need help? <a href="mailto:support@interviewera.com" style={{ color: brandPurple, textDecoration: 'none', fontWeight: '500' }}>Contact Support</a>
          <br />
          <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'inline-block', marginTop: '4px' }}>
            Reply directly to this email. Our team reads every response.
          </span>
        </td>
      </tr>
    </table>
  );
}
