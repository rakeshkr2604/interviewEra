import * as React from 'react';

interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  ariaLabel?: string;
  style?: React.CSSProperties;
  reassurance?: string;
}

export function CTAButton({ href, children, ariaLabel, style, reassurance }: CTAButtonProps) {
  return (
    <div style={{ margin: '24px 0', textAlign: 'center' }}>
      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        <tr>
          <td align="center" style={{ borderRadius: '12px', backgroundColor: '#5B21F4' }}>
            <a
              href={href}
              aria-label={ariaLabel}
              style={{
                display: 'block',
                backgroundColor: '#5B21F4',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '16px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                textAlign: 'center',
                border: '1px solid #5B21F4',
                boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)',
                ...style,
              }}
              className="cta-button"
            >
              {children}
            </a>
          </td>
        </tr>
      </table>
      {reassurance && (
        <p
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '10px',
            marginBottom: 0,
            textAlign: 'center',
            fontWeight: '500',
            letterSpacing: '0.01em',
          }}
          className="text-secondary"
        >
          {reassurance}
        </p>
      )}
    </div>
  );
}
