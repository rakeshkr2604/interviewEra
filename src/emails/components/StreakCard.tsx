import * as React from 'react';

interface StreakCardProps {
  streak?: number;
  style?: React.CSSProperties;
}

export function StreakCard({ streak, style }: StreakCardProps) {
  const isStreakActive = typeof streak === 'number' && streak > 0;

  if (isStreakActive) {
    return (
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          margin: '20px 0',
          textAlign: 'center',
          ...style,
        }}
        className="security-notice"
      >
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#b45309', margin: 0 }} className="security-notice-title">
          🔥 Current Streak: {streak} Mock Interviews
        </p>
        <p style={{ fontSize: '12px', fontWeight: '500', color: '#78350f', margin: '4px 0 0 0' }} className="security-notice-list">
          Don't lose your streak. Practice consistently to stay sharp.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#f5f3ff',
        border: '1px solid #ddd6fe',
        borderRadius: '12px',
        margin: '20px 0',
        textAlign: 'center',
        ...style,
      }}
      className="info-card"
    >
      <p style={{ fontSize: '14px', fontWeight: '700', color: '#7c3aed', margin: 0 }}>
        🎯 Milestone Target
      </p>
      <p style={{ fontSize: '12px', fontWeight: '500', color: '#4b5563', margin: '4px 0 0 0' }} className="text-secondary">
        You're only <strong>2 mock interviews</strong> away from Interview Ready.
      </p>
    </div>
  );
}
