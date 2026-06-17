import * as React from 'react';
import { CTAButton } from './CTAButton';

interface RecommendationCardProps {
  role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  practiceUrl: string;
  weakestSkillName?: string;
  expectedImprovement?: string;
  style?: React.CSSProperties;
}

export function RecommendationCard({
  role,
  difficulty,
  estimatedMinutes,
  practiceUrl,
  weakestSkillName,
  expectedImprovement = 'Expected improvement: +5 to +8 overall score',
  style,
}: RecommendationCardProps) {
  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#f5f3ff',
        border: '1px solid #ddd6fe',
        borderRadius: '12px',
        margin: '24px 0',
        ...style,
      }}
      className="recommendation-card"
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#7c3aed',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 12px 0',
        }}
      >
        Recommended Next Interview
      </p>

      {weakestSkillName && (
        <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 12px 0' }} className="text-secondary">
          Because <strong>{weakestSkillName}</strong> was your weakest skill, we recommend:
        </p>
      )}
      
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '800',
          color: '#18181b',
          margin: '0 0 16px 0',
          lineHeight: '24px',
        }}
        className="text-primary"
      >
        {role}
      </h3>

      <table border={0} cellPadding={0} cellSpacing={0} style={{ marginBottom: '20px' }} width="100%">
        <tr>
          <td style={{ fontSize: '13px', color: '#6b7280', paddingRight: '12px' }} className="text-secondary">
            ⏱ <strong>Duration:</strong> {estimatedMinutes} mins
          </td>
          <td style={{ fontSize: '13px', color: '#6b7280', paddingRight: '12px' }} className="text-secondary">
            ⚡ <strong>Difficulty:</strong> {difficulty}
          </td>
          {expectedImprovement && (
            <td style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
              📈 {expectedImprovement}
            </td>
          )}
        </tr>
      </table>

      <CTAButton href={practiceUrl} style={{ margin: 0 }}>
        Practice Recommended Interview &rarr;
      </CTAButton>
    </div>
  );
}
