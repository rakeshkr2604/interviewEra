import * as React from 'react';

interface SummaryCardProps {
  strengths: string[];
  improvements: string[];
  recommendation?: string;
  style?: React.CSSProperties;
}

export function SummaryCard({ strengths, improvements, recommendation, style }: SummaryCardProps) {
  return (
    <div
      style={{
        padding: '24px',
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
          margin: '0 0 20px 0',
        }}
        className="text-primary"
      >
        Performance Feedback
      </h3>

      <table border={0} cellPadding={0} cellSpacing={0} width="100%">
        {/* Strengths Section */}
        {strengths && strengths.length > 0 && (
          <tr>
            <td valign="top" style={{ paddingBottom: '20px' }}>
              <table border={0} cellPadding={0} cellSpacing={0} width="100%">
                <tr>
                  <td valign="top" width="24" style={{ fontSize: '15px', color: '#10b981', fontWeight: 'bold', lineHeight: '20px' }}>
                    🟢
                  </td>
                  <td valign="top">
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }} className="text-primary">
                      What impressed the AI
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#4b5563', lineHeight: '18px' }} className="text-secondary">
                      {strengths.map((str, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{str}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        )}

        {/* Improvements Section */}
        {improvements && improvements.length > 0 && (
          <tr>
            <td valign="top" style={{ paddingBottom: '20px' }}>
              <table border={0} cellPadding={0} cellSpacing={0} width="100%">
                <tr>
                  <td valign="top" width="24" style={{ fontSize: '15px', color: '#f59e0b', fontWeight: 'bold', lineHeight: '20px' }}>
                    🟡
                  </td>
                  <td valign="top">
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }} className="text-primary">
                      Where you struggled
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#4b5563', lineHeight: '18px' }} className="text-secondary">
                      {improvements.map((imp, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{imp}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        )}

        {/* Recommendation Section */}
        {recommendation && (
          <tr>
            <td valign="top">
              <table border={0} cellPadding={0} cellSpacing={0} width="100%">
                <tr>
                  <td valign="top" width="24" style={{ fontSize: '15px', color: '#7c3aed', fontWeight: 'bold', lineHeight: '20px' }}>
                    💡
                  </td>
                  <td valign="top">
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }} className="text-primary">
                      Immediate improvement
                    </p>
                    <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '18px' }} className="text-secondary">
                      {recommendation}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        )}
      </table>
    </div>
  );
}
