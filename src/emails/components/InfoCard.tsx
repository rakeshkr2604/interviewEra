import * as React from 'react';

interface InfoCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function InfoCard({ children, style }: InfoCardProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#f5f3ff',
        borderRadius: '8px',
        border: '1px solid #e9d5ff',
        margin: '20px 0',
        ...style,
      }}
      className="info-card"
    >
      {children}
    </div>
  );
}
