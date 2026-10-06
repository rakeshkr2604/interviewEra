import * as React from 'react';

interface WeeklyGoalSectionProps {
  goalText: string;
  targetCount: number;
  currentCount: number;
  style?: React.CSSProperties;
}

export function WeeklyGoalSection({ goalText, targetCount, currentCount, style }: WeeklyGoalSectionProps) {
  const percentage = Math.min(100, Math.round((currentCount / targetCount) * 100));

  return (
    <div
      style={{
        padding: '20px 24px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        margin: '24px 0',
        ...style,
      }}
      className="summary-card"
    >
      <h3
        style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#18181b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 16px 0',
        }}
        className="text-primary"
      >
        Weekly Goal Progress
      </h3>

      <div style={{ marginBottom: '12px' }}>
        <table border={0} cellPadding={0} cellSpacing={0} width="100%">
          <tr>
            <td style={{ fontSize: '14px', fontWeight: '700', color: '#18181b' }} className="text-primary">
              🎯 {goalText}
            </td>
            <td align="right" style={{ fontSize: '14px', fontWeight: '700', color: '#5B21F4' }}>
              {currentCount} / {targetCount}
            </td>
          </tr>
        </table>
      </div>

      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: '#5B21F4',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
