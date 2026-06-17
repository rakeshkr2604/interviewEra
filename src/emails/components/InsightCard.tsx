import * as React from 'react';

interface InsightItem {
  name: string;
  score: number;
}

interface InsightCardProps {
  strongest: InsightItem;
  weakest: InsightItem;
  style?: React.CSSProperties;
}

export function InsightCard({ strongest, weakest, style }: InsightCardProps) {
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
      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        <tr>
          <td valign="top" style={{ width: '50%', paddingRight: '12px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
              Your strongest skill
            </p>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#18181b', margin: '0 0 2px 0' }} className="text-primary">
              {strongest.name}
            </p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a', margin: 0 }}>
              {strongest.score}/100
            </p>
          </td>
          <td valign="top" style={{ width: '50%', borderLeft: '1px solid #e5e7eb', paddingLeft: '16px' }} className="divider">
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
              Needs the most improvement
            </p>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#18181b', margin: '0 0 2px 0' }} className="text-primary">
              {weakest.name}
            </p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', margin: 0 }}>
              {weakest.score}/100
            </p>
          </td>
        </tr>
      </table>
    </div>
  );
}
