import * as React from 'react';

export interface HighlightsData {
  bestAnswer: string;
  toughestQuestion: string;
  longestResponse: string;
}

interface HighlightsCardProps {
  highlights?: HighlightsData;
  style?: React.CSSProperties;
}

export function HighlightsCard({ highlights, style }: HighlightsCardProps) {
  if (!highlights) return null;

  const items = [
    { label: 'Best Answer', value: highlights.bestAnswer },
    { label: 'Toughest Question', value: highlights.toughestQuestion },
    { label: 'Longest Response', value: highlights.longestResponse },
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
        Interview Highlights
      </h3>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        {items.map((item, idx) => (
          <tr key={idx}>
            <td
              valign="top"
              width="24"
              style={{
                paddingBottom: idx < items.length - 1 ? '12px' : '0',
                paddingTop: idx > 0 ? '12px' : '0',
                fontSize: '14px',
                color: '#10b981',
                fontWeight: 'bold',
                lineHeight: '20px',
              }}
            >
              ✔
            </td>
            <td
              style={{
                paddingBottom: idx < items.length - 1 ? '12px' : '0',
                paddingTop: idx > 0 ? '12px' : '0',
                fontSize: '13px',
                lineHeight: '18px',
                color: '#4b5563',
              }}
              className="text-secondary"
            >
              <strong>{item.label}:</strong> {item.value}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
