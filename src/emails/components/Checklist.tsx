import * as React from 'react';

export interface ChecklistItem {
  icon?: string;
  text: string;
}

interface ChecklistProps {
  items: ChecklistItem[];
  title?: string;
}

export function Checklist({ items, title }: ChecklistProps) {
  return (
    <div style={{ margin: '24px 0' }}>
      {title && (
        <p style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#4b5563',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 12px 0'
        }} className="text-secondary">
          {title}
        </p>
      )}
      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        {items.map((item, idx) => (
          <tr key={idx}>
            <td
              valign="top"
              width="28"
              style={{
                paddingBottom: '12px',
                fontSize: '16px',
                lineHeight: '20px',
                textAlign: 'left',
              }}
            >
              {item.icon || '✓'}
            </td>
            <td
              style={{
                paddingBottom: '12px',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#4b5563',
              }}
              className="text-secondary"
            >
              {item.text}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
