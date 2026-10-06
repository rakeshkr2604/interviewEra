import * as React from 'react';
import { generateTrend } from '../utils/weeklyHelpers';

interface WeeklyTrendSectionProps {
  previousWeekScore: number;
  currentWeekScore: number;
  style?: React.CSSProperties;
}

export function WeeklyTrendSection({ previousWeekScore, currentWeekScore, style }: WeeklyTrendSectionProps) {
  const trend = generateTrend(currentWeekScore, previousWeekScore);

  let bgColor = '#f4f4f5';
  let borderColor = '#e4e4e7';
  if (trend.delta > 0) {
    bgColor = '#f0fdf4';
    borderColor = '#bbf7d0';
  } else if (trend.delta < 0) {
    bgColor = '#fef2f2';
    borderColor = '#fecaca';
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        margin: '24px 0',
        textAlign: 'center',
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
          margin: '0 0 20px 0',
        }}
        className="text-primary"
      >
        Weekly Score Trend
      </h3>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%" style={{ tableLayout: 'fixed' }}>
        <tr>
          {/* Previous Week Score */}
          <td align="center" valign="middle">
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', margin: '0 0 6px 0' }} className="text-secondary">
              Previous Week
            </p>
            <p style={{ fontSize: '36px', fontWeight: '800', color: '#18181b', margin: 0 }} className="text-primary">
              {previousWeekScore}
            </p>
          </td>

          {/* Trend Indicator */}
          <td align="center" valign="middle" width="100">
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
            }} className="trend-badge">
              <span style={{ fontSize: '15px', fontWeight: '800', color: trend.color }}>
                {trend.arrow} {trend.formatted}
              </span>
            </div>
          </td>

          {/* Current Week Score */}
          <td align="center" valign="middle">
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#5B21F4', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
              Current Week
            </p>
            <p style={{ fontSize: '36px', fontWeight: '800', color: '#5B21F4', margin: 0 }}>
              {currentWeekScore}
            </p>
          </td>
        </tr>
      </table>
    </div>
  );
}
