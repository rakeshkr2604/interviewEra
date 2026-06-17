import * as React from 'react';

interface SecurityNoticeProps {
  expiresInMinutes?: number;
  expiresInHours?: number;
}

export function SecurityNotice({ expiresInMinutes, expiresInHours }: SecurityNoticeProps) {
  const durationText = expiresInMinutes
    ? `Link expires in ${expiresInMinutes} minutes`
    : expiresInHours
    ? `Link expires in ${expiresInHours} ${expiresInHours === 1 ? 'hour' : 'hours'}`
    : 'Link expires shortly';

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#fffbeb',
        borderRadius: '8px',
        border: '1px solid #fde68a',
        margin: '24px 0',
      }}
      className="security-notice"
    >
      <p style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#b45309',
        margin: '0 0 8px 0',
      }} className="security-notice-title">
        Security Notice
      </p>
      <ul style={{
        margin: 0,
        paddingLeft: '20px',
        fontSize: '13px',
        lineHeight: '18px',
        color: '#78350f',
      }} className="security-notice-list">
        <li style={{ marginBottom: '4px' }}>{durationText}</li>
        <li>If you did not request this email, you can safely ignore it.</li>
      </ul>
    </div>
  );
}
