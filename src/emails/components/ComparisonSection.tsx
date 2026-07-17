import * as React from 'react';
import { calculatePercentile } from '../utils/helpers';

interface ComparisonSectionProps {
  scores: {
    communication: number;
    technical: number;
    confidence: number;
    problemSolving: number;
    structure: number;
  };
  labels?: {
    communication: string;
    technical: string;
    confidence: string;
    problemSolving: string;
    structure: string;
  };
  role: string;
  style?: React.CSSProperties;
}

export function ComparisonSection({ scores, labels, role, style }: ComparisonSectionProps) {
  const categories = [
    { label: labels?.communication ?? 'Communication', score: scores.communication },
    { label: labels?.technical ?? 'Technical Depth', score: scores.technical },
    { label: labels?.confidence ?? 'Confidence', score: scores.confidence },
    { label: labels?.problemSolving ?? 'Problem Solving', score: scores.problemSolving },
    { label: labels?.structure ?? 'Answer Structure', score: scores.structure },
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
          margin: '0 0 4px 0',
        }}
        className="text-primary"
      >
        How you compare
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: '#6b7280',
          margin: '0 0 16px 0',
        }}
        className="text-secondary"
      >
        Compared to candidates preparing for <strong>{role}</strong>:
      </p>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        {categories.map((cat, idx) => {
          const percentile = calculatePercentile(cat.score);
          
          let barColor = '#f59e0b';
          if (cat.score >= 90) barColor = '#10b981';
          else if (cat.score >= 80) barColor = '#7c3aed';

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
                className={idx < categories.length - 1 ? 'divider' : ''}
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
                      width: `${cat.score}%`,
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
                className={idx < categories.length - 1 ? 'divider' : ''}
              >
                {cat.score}{' '}
                <span style={{ color: '#10b981', marginLeft: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                  Top {percentile}%
                </span>
              </td>
            </tr>
          );
        })}
      </table>
    </div>
  );
}
