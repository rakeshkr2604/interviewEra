import * as React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  style?: React.CSSProperties;
}

export function MetricCard({ label, value, style }: MetricCardProps) {
  return (
    <div
      style={{
        display: 'inline-block',
        width: '146px',
        padding: '12px 16px',
        margin: '6px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxSizing: 'border-box',
        verticalAlign: 'top',
        ...style,
      }}
      className="metric-card"
    >
      <p
        style={{
          fontSize: '10px',
          fontWeight: '700',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 4px 0',
        }}
        className="text-secondary"
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#18181b',
          margin: 0,
          lineHeight: '18px',
          wordBreak: 'break-word',
        }}
        className="text-primary"
      >
        {value}
      </p>
    </div>
  );
}
