import * as React from 'react';
import { Footer } from './Footer';

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  unsubscribeUrl?: string;
  footerTagline?: string;
}

export function EmailLayout({ children, previewText, unsubscribeUrl, footerTagline }: EmailLayoutProps) {
  const brandPurple = '#7c3aed';
  const textDark = '#18181b';

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>InterviewEra</title>
        <style dangerouslySetInnerHTML={{ __html: `
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 16px !important;
            }
            .content-box {
              padding: 24px 16px !important;
            }
            .feature-grid-cell {
              display: block !important;
              width: 100% !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #09090b !important;
              color: #fafafa !important;
            }
            .email-container {
              background-color: #09090b !important;
            }
            .content-box {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
            .text-primary {
              color: #fafafa !important;
            }
            .text-secondary {
              color: #a1a1aa !important;
            }
            .footer-text, .footer-link {
              color: #52525b !important;
            }
            .divider {
              border-top-color: #27272a !important;
            }
            /* Progress Tracker Dark Mode */
            .progress-tracker {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
            .progress-step.pending {
              color: #52525b !important;
            }
            .progress-step.completed {
              color: #34d399 !important;
            }
            .progress-step.active {
              color: #a78bfa !important;
            }
            /* Info Card Dark Mode */
            .info-card {
              background-color: #18181b !important;
              border-color: #3f3f46 !important;
            }
            /* Security Notice Dark Mode */
            .security-notice {
              background-color: #1c1917 !important;
              border-color: #44403c !important;
            }
            .security-notice-title {
              color: #f59e0b !important;
            }
            .security-notice-list {
              color: #d6d3d1 !important;
            }
            /* Score Card and Metric Card Dark Mode */
            .score-card, .metric-card {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
            /* Summary Card and Share Section Dark Mode */
            .summary-card, .share-section {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
            /* Recommendation Card Dark Mode */
            .recommendation-card {
              background-color: #1a1528 !important;
              border-color: #4c1d95 !important;
            }
            /* Score Accent Classes in Dark Mode */
            .score-accent-elite {
              background-color: #062016 !important;
              border-color: #059669 !important;
              color: #34d399 !important;
            }
            .score-accent-good {
              background-color: #1a1528 !important;
              border-color: #4c1d95 !important;
              color: #a78bfa !important;
            }
            .score-accent-average {
              background-color: #271c0c !important;
              border-color: #d97706 !important;
              color: #fbbf24 !important;
            }
            .score-accent-low {
              background-color: #270e0f !important;
              border-color: #dc2626 !important;
              color: #f87171 !important;
            }
            /* Product update email */
            .feature-card, .credits-badge {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
            .feature-icon-bg {
              background-color: #1a1528 !important;
            }
            .new-badge {
              background-color: #2e1065 !important;
              color: #c4b5fd !important;
            }
            .product-preview-image {
              border-color: #3f3f46 !important;
            }
            .product-preview-frame {
              background-color: #1a1528 !important;
              border-color: #27272a !important;
            }
            .credits-reassurance {
              background-color: #18181b !important;
              border-color: #27272a !important;
            }
          }
        `}} />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#f9fafb',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: textDark,
        WebkitTextSizeAdjust: '100%',
        msTextSizeAdjust: '100%',
      } as React.CSSProperties}>
        {previewText && (
          <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 }}>
            {previewText}
          </div>
        )}
        <table border={0} cellPadding={0} cellSpacing={0} width="100%" style={{ backgroundColor: '#f9fafb' }}>
          <tr>
            <td align="center" style={{ padding: '40px 10px 40px 10px' }}>
              <table border={0} cellPadding={0} cellSpacing={0} className="email-container" width="600" style={{ maxWidth: '600px' }}>
                {/* Logo / Header */}
                <tr>
                  <td align="center" style={{ paddingBottom: '24px' }}>
                    <a href="https://interviewera.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: textDark,
                        letterSpacing: '-0.025em',
                      }} className="text-primary">
                        Interview<span style={{ color: brandPurple }}>Era</span>
                      </span>
                    </a>
                  </td>
                </tr>

                {/* Content Box */}
                <tr>
                  <td className="content-box" style={{
                    padding: '32px 32px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
                  }}>
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td align="center" style={{ paddingTop: '32px', paddingBottom: '16px' }}>
                    <Footer unsubscribeUrl={unsubscribeUrl} tagline={footerTagline} />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
