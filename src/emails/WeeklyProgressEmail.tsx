import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { MetricCard } from './components/MetricCard';
import { RecommendationCard } from './components/RecommendationCard';
import { WeeklyTrendSection } from './components/WeeklyTrendSection';
import { WeeklyDimensionsSection } from './components/WeeklyDimensionsSection';
import { WeeklyGoalSection } from './components/WeeklyGoalSection';
import { WeeklyLeaderboardCard } from './components/WeeklyLeaderboardCard';
import { CTAButton } from './components/CTAButton';
import {
  WeeklyDimensionScores,
  generateCoachMessage,
  generateAchievementBadges,
  generateWeakestArea,
  generateStrongestArea,
  generateRecommendation,
} from './utils/weeklyHelpers';

export interface WeeklyProgressEmailProps {
  candidateName: string;
  weekStart: string;
  weekEnd: string;
  streak: number;
  interviewsCompleted: number;
  practiceMinutes: number;
  previousWeekScore: number;
  currentWeekScore: number;
  dimensions: WeeklyDimensionScores;
  achievements?: string[];
  weeklyGoal?: {
    goalText: string;
    targetCount: number;
    currentCount: number;
  };
  leaderboard?: {
    percentile: number;
    role: string;
  };
  reportUrl: string;
  practiceUrl: string;
  unsubscribeUrl: string;
}

const defaultMockData: WeeklyProgressEmailProps = {
  candidateName: 'Rakesh',
  weekStart: 'Jun 10',
  weekEnd: 'Jun 17',
  streak: 5,
  interviewsCompleted: 3,
  practiceMinutes: 120,
  previousWeekScore: 79,
  currentWeekScore: 87,
  dimensions: {
    communication: { current: 91, previous: 80 },
    technical: { current: 83, previous: 85 },
    confidence: { current: 89, previous: 85 },
    problemSolving: { current: 86, previous: 82 },
    structure: { current: 84, previous: 80 },
  },
  achievements: [
    '🏅 Excellent Communicator',
    '🔥 5 Mock Interview Streak',
    '⭐ Top 20%',
  ],
  weeklyGoal: {
    goalText: 'Complete 5 mock interviews',
    targetCount: 5,
    currentCount: 3,
  },
  leaderboard: {
    percentile: 18,
    role: 'Frontend Engineer',
  },
  reportUrl: 'https://interviewera.com/dashboard',
  practiceUrl: 'https://interviewera.com/practice',
  unsubscribeUrl: 'https://interviewera.com/unsubscribe',
};

export default function WeeklyProgressEmail(props: Partial<WeeklyProgressEmailProps>) {
  const data = { ...defaultMockData, ...props } as WeeklyProgressEmailProps;

  const {
    candidateName,
    weekStart,
    weekEnd,
    streak,
    interviewsCompleted,
    practiceMinutes,
    previousWeekScore,
    currentWeekScore,
    dimensions,
    achievements,
    weeklyGoal,
    leaderboard,
    reportUrl,
    practiceUrl,
    unsubscribeUrl,
  } = data;

  const greeting = candidateName && candidateName.toLowerCase() !== 'there'
    ? `Hi ${candidateName} 👋`
    : 'Hi there 👋';

  const subGreeting = `Here's your InterviewEra Weekly Progress Report for ${weekStart} – ${weekEnd}.`;

  const overallImprovement = currentWeekScore - previousWeekScore;
  const improvementText = overallImprovement >= 0 ? `+${overallImprovement} pts` : `${overallImprovement} pts`;

  const strongest = generateStrongestArea(dimensions);
  const weakest = generateWeakestArea(dimensions);
  
  const coachMessage = generateCoachMessage(dimensions, currentWeekScore);

  const finalAchievements = achievements || generateAchievementBadges(dimensions, streak, leaderboard?.percentile);

  const recommendation = generateRecommendation(dimensions, leaderboard?.role || 'Frontend Engineer');

  const motivationText = strongest.delta > 0
    ? `You improved your ${strongest.name.toLowerCase()} by ${strongest.delta} points this week. Keeping this pace for two more weeks should put you in the Interview Ready range.`
    : 'Consistency is the key to mastering engineering interviews. Practice one more target session this week to keep your momentum going!';

  const showStrongest = strongest.delta > 0;

  return (
    <EmailLayout
      previewText={`Your weekly performance update is ready! Overall score: ${currentWeekScore}/100.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Header Greeting */}
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#1f2937',
        margin: '0 0 8px 0',
      }} className="text-primary">
        {greeting},
      </p>

      {/* Report Info */}
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#4b5563',
        margin: '0 0 24px 0',
      }} className="text-secondary">
        {subGreeting}
      </p>

      {/* Snapshot Cards */}
      <div style={{ margin: '24px 0' }}>
        <h3
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#18181b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 12px 0',
          }}
          className="text-primary"
        >
          Weekly Snapshot
        </h3>
        <table border={0} cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' }}>
          <tr>
            <td style={{ paddingRight: '8px', paddingBottom: '12px' }} width="50%">
              <MetricCard label="🔥 Current Streak" value={`${streak} days`} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px', paddingBottom: '12px' }} width="50%">
              <MetricCard label="🎤 Completed" value={`${interviewsCompleted} mock`} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
          </tr>
          <tr>
            <td style={{ paddingRight: '8px' }} width="50%">
              <MetricCard label="⏱ Practice" value={`${practiceMinutes} min`} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px' }} width="50%">
              <MetricCard label="📈 Improvement" value={improvementText} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
          </tr>
        </table>
      </div>

      {/* Score Trend Section */}
      <WeeklyTrendSection
        previousWeekScore={previousWeekScore}
        currentWeekScore={currentWeekScore}
      />

      {/* Dimension Progress List */}
      <WeeklyDimensionsSection dimensions={dimensions} />

      {/* Achievements unlocked */}
      {finalAchievements && finalAchievements.length > 0 && (
        <div style={{ margin: '28px 0' }}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#18181b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 12px 0',
            }}
            className="text-primary"
          >
            Achievement Unlocks
          </h3>
          <div style={{ margin: '0 -4px' }}>
            {finalAchievements.map((badge, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  margin: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Biggest Improvement highlights */}
      {showStrongest && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            margin: '24px 0',
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#16a34a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 6px 0',
          }}>
            📈 Biggest Improvement
          </p>
          <table border={0} cellPadding={0} cellSpacing={0} width="100%">
            <tr>
              <td style={{ fontSize: '15px', fontWeight: '800', color: '#18181b' }} className="text-primary">
                {strongest.name}
              </td>
              <td align="right" style={{ fontSize: '15px', fontWeight: '800', color: '#16a34a' }}>
                {strongest.formattedDelta} pts
              </td>
            </tr>
          </table>
        </div>
      )}

      {/* Needs Practice Highlight */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          margin: '24px 0',
        }}
      >
        <p style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#dc2626',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 6px 0',
        }}>
          ⚠️ Needs More Practice
        </p>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#18181b', margin: '0 0 4px 0' }} className="text-primary">
          {weakest.name} (Score: {weakest.score})
        </p>
        <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '18px' }} className="text-secondary">
          {weakest.suggestion}
        </p>
      </div>

      {/* AI Coach Notes */}
      {coachMessage && (
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: '12px',
            margin: '24px 0',
          }}
          className="recommendation-card"
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#7c3aed',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 10px 0',
            }}
          >
            🤖 AI Weekly Coach
          </p>
          <p
            style={{
              fontSize: '13px',
              lineHeight: '20px',
              color: '#4b5563',
              margin: 0,
              fontStyle: 'italic',
            }}
            className="text-secondary"
          >
            "{coachMessage}"
          </p>
        </div>
      )}

      {/* Weekly Goal Progress section */}
      {weeklyGoal && (
        <WeeklyGoalSection
          goalText={weeklyGoal.goalText}
          targetCount={weeklyGoal.targetCount}
          currentCount={weeklyGoal.currentCount}
        />
      )}

      {/* Leaderboard Callout */}
      {leaderboard && (
        <WeeklyLeaderboardCard
          percentile={leaderboard.percentile}
          role={leaderboard.role}
        />
      )}

      {/* AI Motivation Sentence */}
      <p style={{
        fontSize: '13px',
        color: '#4b5563',
        lineHeight: '20px',
        margin: '24px 0',
        fontStyle: 'italic',
        textAlign: 'center',
      }} className="text-secondary">
        "{motivationText}"
      </p>

      {/* Dynamic Recommendation Card choosing next practice track */}
      <RecommendationCard
        role={recommendation.role}
        difficulty={recommendation.difficulty}
        estimatedMinutes={recommendation.estimatedMinutes}
        practiceUrl={recommendation.url}
        weakestSkillName={weakest.name}
        expectedImprovement={recommendation.expectedScoreGain}
      />

      {/* Call To Action Buttons */}
      <CTAButton href={practiceUrl}>
        Continue Practicing &rarr;
      </CTAButton>

      <div style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '28px' }}>
        <a
          href={reportUrl}
          style={{
            fontSize: '14px',
            color: '#7c3aed',
            textDecoration: 'underline',
            fontWeight: '600',
          }}
        >
          View Full Dashboard
        </a>
      </div>
    </EmailLayout>
  );
}
