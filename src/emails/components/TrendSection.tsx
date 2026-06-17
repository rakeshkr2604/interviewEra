import * as React from 'react';

export interface TrendItem {
  label: string;
  change: number;
}

interface TrendSectionProps {
  trends?: TrendItem[];
  style?: React.CSSProperties;
}

export function TrendSection({ trends, style }: TrendSectionProps) {
  if (!trends || trends.length === 0) return null;

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        margin: '20px 0',
        ...style,
      }}
      className="summary-card"
    >
      <p
        style={{
          fontSize: '10px',
          fontWeight: '700',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 12px 0',
        }}
        className="text-secondary"
      >
        Improvement since last interview
      </p>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        <tr>
          {trends.map((trend, idx) => {
            const isPositive = trend.change >= 0;
            const sign = isPositive ? '↑' : '↓';
            const signText = isPositive ? `+${trend.change}` : `${trend.change}`;
            const color = isPositive ? '#16a34a' : '#dc2626';

            return (
              <td
                key={idx}
                valign="top"
                style={{
                  paddingRight: idx < trends.length - 1 ? '16px' : '0',
                  borderRight: idx < trends.length - 1 ? '1px solid #e5e7eb' : 'none',
                  paddingLeft: idx > 0 ? '16px' : '0',
                }}
                className={idx < trends.length - 1 ? 'divider' : ''}
              >
                <p style={{ fontSize: '11px', fontWeight: '500', color: '#71717a', margin: '0 0 4px 0' }} className="text-secondary">
                  {trend.label}
                </p>
                <p style={{ fontSize: '15px', fontWeight: '800', color: color, margin: 0 }}>
                  <span style={{ marginRight: '4px' }}>{sign}</span>
                  {signText}
                </p>
              </td>
            );
          })}
        </tr>
      </table>
    </div>
  );
}
