import * as React from 'react';

interface WeeklyLeaderboardCardProps {
  percentile: number;
  role: string;
  style?: React.CSSProperties;
}

export function WeeklyLeaderboardCard({ percentile, role, style }: WeeklyLeaderboardCardProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#f5f3ff',
        border: '1px solid #ddd6fe',
        borderRadius: '12px',
        margin: '24px 0',
        textAlign: 'center',
        ...style,
      }}
      className="info-card"
    >
      <p style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', margin: 0 }} className="text-secondary">
        📊 You're ranked <strong style={{ color: '#5B21F4' }}>Top {percentile}%</strong> among {role} candidates.
      </p>
    </div>
  );
}
