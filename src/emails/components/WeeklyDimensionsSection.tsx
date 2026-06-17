import * as React from 'react';
import { WeeklyDimensionScores } from '../utils/weeklyHelpers';

interface WeeklyDimensionsSectionProps {
  dimensions: WeeklyDimensionScores;
  style?: React.CSSProperties;
}

export function WeeklyDimensionsSection({ dimensions, style }: WeeklyDimensionsSectionProps) {
  const categories = [
    { label: 'Communication', data: dimensions.communication },
    { label: 'Technical Depth', data: dimensions.technical },
    { label: 'Confidence', data: dimensions.confidence },
    { label: 'Problem Solving', data: dimensions.problemSolving },
    { label: 'Answer Structure', data: dimensions.structure },
  ];

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
        Dimension Progress
      </h3>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        {categories.map((cat, idx) => {
          const delta = cat.data.current - cat.data.previous;
          const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
          
          let deltaColor = '#71717a';
          if (delta > 0) deltaColor = '#16a34a';
          else if (delta < 0) deltaColor = '#dc2626';

          let barColor = '#f59e0b';
          if (cat.data.current >= 90) barColor = '#10b981';
          else if (cat.data.current >= 80) barColor = '#7c3aed';

          return (
            <tr key={idx}>
              <td
                style={{
                  paddingBottom: idx < categories.length - 1 ? '12px' : '0',
                  paddingTop: idx > 0 ? '12px' : '0',
                  fontSize: '13px',
                  color: '#4b5563',
                  fontWeight: '500',
                  borderBottom: idx < categories.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                {cat.label}
              </td>
              <td
                style={{
                  paddingBottom: idx < categories.length - 1 ? '12px' : '0',
                  paddingTop: idx > 0 ? '12px' : '0',
                  borderBottom: idx < categories.length - 1 ? '1px solid #f3f4f6' : 'none',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                }}
                valign="middle"
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    height: '6px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${cat.data.current}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </td>
              <td
                align="right"
                style={{
                  paddingBottom: idx < categories.length - 1 ? '12px' : '0',
                  paddingTop: idx > 0 ? '12px' : '0',
                  fontSize: '13px',
                  color: '#18181b',
                  fontWeight: '700',
                  borderBottom: idx < categories.length - 1 ? '1px solid #f3f4f6' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.data.current}{' '}
                {delta !== 0 && (
                  <span style={{ color: deltaColor, marginLeft: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                    {deltaText}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}
