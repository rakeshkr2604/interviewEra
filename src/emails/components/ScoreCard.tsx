import * as React from 'react';

interface ScoreCardProps {
  label: string;
  score: number;
  style?: React.CSSProperties;
}

export function ScoreCard({ label, score, style }: ScoreCardProps) {
  const getScoreIndicator = (s: number) => {
    if (s >= 90) {
      return {
        label: 'Excellent',
        textColor: '#16a34a',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
      };
    }
    if (s >= 80) {
      return {
        label: 'Good',
        textColor: '#7c3aed',
        bgColor: '#f5f3ff',
        borderColor: '#ddd6fe',
      };
    }
    if (s >= 70) {
      return {
        label: 'Average',
        textColor: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
      };
    }
    return {
      label: 'Needs work',
      textColor: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
    };
  };

  const indicator = getScoreIndicator(score);

  return (
    <div
      style={{
        display: 'inline-block',
        width: '146px',
        padding: '16px',
        margin: '6px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        textAlign: 'center',
        boxSizing: 'border-box',
        verticalAlign: 'top',
        ...style,
      }}
      className="score-card"
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 6px 0',
        }}
        className="text-secondary"
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '28px',
          fontWeight: '800',
          color: '#7c3aed',
          margin: 0,
          lineHeight: '34px',
        }}
      >
        {score}
      </p>
      <div style={{ marginTop: '6px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '700',
            color: indicator.textColor,
            backgroundColor: indicator.bgColor,
            border: `1px solid ${indicator.borderColor}`,
            padding: '2px 8px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            display: 'inline-block',
          }}
        >
          {indicator.label}
        </span>
      </div>
    </div>
  );
}
