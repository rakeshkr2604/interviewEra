import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { ProgressTracker } from './components/ProgressTracker';
import { ScoreCard } from './components/ScoreCard';
import { MetricCard } from './components/MetricCard';
import { SummaryCard } from './components/SummaryCard';
import { RecommendationCard } from './components/RecommendationCard';
import { ShareSection } from './components/ShareSection';
import { CTAButton } from './components/CTAButton';
import { InsightCard } from './components/InsightCard';
import { TrendSection, TrendItem } from './components/TrendSection';
import { ComparisonSection } from './components/ComparisonSection';
import { HighlightsCard, HighlightsData } from './components/HighlightsCard';
import { StreakCard } from './components/StreakCard';
import {
  generateScoreAccent,
  generateRoadmap,
  generateSummary,
  calculateScoreInsights,
  generateAchievementBadge,
  calculateHiringReadiness,
  selectRecommendedInterview,
  generateCoachingNote,
  calculatePercentile,
  generateReadinessDescription,
  InputRoadmapItem,
} from './utils/helpers';

export type InterviewEmailScoreLabels = {
  communication: string;
  technical: string;
  confidence: string;
  problemSolving: string;
  structure: string;
};

export interface InterviewCompletedEmailProps {
  candidateName: string;
  overallScore: number;
  scores: {
    communication: number;
    technical: number;
    confidence: number;
    problemSolving: number;
    structure: number;
  };
  /** Override ScoreCard / ComparisonSection labels (e.g. score-v1.2 for script engine). */
  scoreLabels?: InterviewEmailScoreLabels;
  /** When true, hide fabricated peer-percentile copy (v2.1 has no population ranks). */
  hidePeerPercentile?: boolean;
  overallSummary?: string;
  strengths: string[];
  weaknesses: string[];
  actionItems?: string[];
  aiCoachNotes?: string;
  trends?: TrendItem[];
  stats: {
    durationMinutes: number;
    totalQuestions: number;
    followUpQuestions: number;
    company?: string;
    role: string;
  };
  roadmap: InputRoadmapItem[];
  shareUrl: string;
  reportUrl: string;
  nextInterview?: {
    role: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    duration: number;
    url: string;
  };
  streak?: number;
  highlights?: HighlightsData;
}

const DEFAULT_SCORE_LABELS: InterviewEmailScoreLabels = {
  communication: 'Communication',
  technical: 'Technical',
  confidence: 'Confidence',
  problemSolving: 'Problem Solving',
  structure: 'Answer Structure',
};

const defaultMockData: InterviewCompletedEmailProps = {
  candidateName: 'Rakesh',
  overallScore: 87,
  scores: {
    communication: 91,
    technical: 83,
    confidence: 89,
    problemSolving: 86,
    structure: 84,
  },
  overallSummary: '', // Left blank to dynamically calculate fallback
  strengths: [
    'Clear communication',
    'Good confidence',
    'Strong React fundamentals',
  ],
  weaknesses: [
    'System Design',
    'Database optimization',
  ],
  actionItems: [
    'Give shorter answers.',
    'Improve backend architecture explanations.',
    'Use STAR for behavioural questions.',
  ],
  aiCoachNotes: 'If you answer 20% slower and structure technical answers in Problem → Approach → Tradeoffs format, your projected score can cross 90.',
  trends: [
    { label: 'Communication', change: 8 },
    { label: 'Confidence', change: 4 },
    { label: 'Technical Depth', change: -2 },
  ],
  stats: {
    durationMinutes: 18,
    totalQuestions: 14,
    followUpQuestions: 7,
    company: 'Amazon',
    role: 'Frontend Engineer',
  },
  roadmap: [
    { title: 'Communication', status: 'completed' },
    { title: 'Technical Depth', status: 'current' },
    { title: 'System Design', status: 'current' },
    { title: 'Leadership', status: 'pending' },
  ],
  shareUrl: 'https://interviewera.com/reports/sample-report-id/share',
  reportUrl: 'https://interviewera.com/reports/sample-report-id',
  streak: 5,
  highlights: {
    bestAnswer: 'Authentication using JWT.',
    toughestQuestion: 'System Design.',
    longestResponse: 'Database Scaling.',
  },
};

export default function InterviewCompletedEmail(props: Partial<InterviewCompletedEmailProps>) {
  // Merge with defaults for standard preview rendering in dev mode
  const data = { ...defaultMockData, ...props } as InterviewCompletedEmailProps;

  const {
    candidateName,
    overallScore,
    scores,
    scoreLabels: scoreLabelsProp,
    hidePeerPercentile = false,
    overallSummary,
    strengths,
    weaknesses,
    actionItems,
    aiCoachNotes,
    trends,
    stats,
    roadmap,
    shareUrl,
    reportUrl,
    nextInterview,
    streak,
    highlights,
  } = data;

  const scoreLabels = { ...DEFAULT_SCORE_LABELS, ...scoreLabelsProp };

  const greeting = candidateName && candidateName.toLowerCase() !== 'there'
    ? `Hi ${candidateName} 👋`
    : 'Hi there 👋';

  const subGreeting = `Congratulations on completing your ${stats.role} mock interview ${
    stats.company ? `at ${stats.company} level` : 'level'
  }.`;

  // AI Calculations via Helpers
  const accent = generateScoreAccent(overallScore);
  const roadmapSteps = generateRoadmap(roadmap);
  const summary = generateSummary({
    strengths,
    weaknesses,
    recommendation: { title: 'Practice Next', description: 'Complete a tailored mock track.' },
  });

  const scoreInsightsRaw = calculateScoreInsights(scores);
  const scoreInsights = {
    strongest: {
      ...scoreInsightsRaw.strongest,
      name:
        scoreLabels[scoreInsightsRaw.strongest.key as keyof typeof scoreLabels] ||
        scoreInsightsRaw.strongest.name,
    },
    weakest: {
      ...scoreInsightsRaw.weakest,
      name:
        scoreLabels[scoreInsightsRaw.weakest.key as keyof typeof scoreLabels] ||
        scoreInsightsRaw.weakest.name,
    },
  };
  const badgeName = generateAchievementBadge(scores);
  const readiness = calculateHiringReadiness(overallScore);
  const coachNote = aiCoachNotes || generateCoachingNote(scores);
  const readinessDescription = overallSummary || generateReadinessDescription(scores, stats);

  // Dynamic recommendation selection if nextInterview is omitted
  const autoRecommendation = selectRecommendedInterview(scores, stats);
  const recommendation = nextInterview
    ? {
        role: nextInterview.role,
        difficulty: nextInterview.difficulty,
        estimatedMinutes: nextInterview.duration,
        url: nextInterview.url,
      }
    : {
        role: autoRecommendation.role,
        difficulty: autoRecommendation.difficulty,
        estimatedMinutes: autoRecommendation.estimatedMinutes,
        url: autoRecommendation.url,
      };

  return (
    <EmailLayout
      previewText={`Great job completing your mock interview! Your AI performance score is ${overallScore}/100.`}
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

      {/* Personalized Sub-greeting */}
      <p style={{
        fontSize: '15px',
        lineHeight: '24px',
        color: '#4b5563',
        margin: '0 0 24px 0',
      }} className="text-secondary">
        {subGreeting}
      </p>

      {/* Hero Score Box with Smart Accent Logic */}
      <div
        style={{
          textAlign: 'center',
          padding: '28px 20px',
          backgroundColor: accent.backgroundColor,
          borderRadius: '12px',
          border: accent.border,
          margin: '24px 0',
        }}
        className={`recommendation-card ${accent.className}`}
      >
        {/* Readiness Pill */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: readiness.textColor,
            backgroundColor: readiness.backgroundColor,
            border: `1px solid ${readiness.borderColor}`,
            padding: '4px 10px',
            borderRadius: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block',
          }}>
            {readiness.label}
          </span>
        </div>

        <p style={{
          fontSize: '12px',
          fontWeight: '700',
          color: accent.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 8px 0',
        }}>
          Overall Score
        </p>

        <div dangerouslySetInnerHTML={{ __html: `
          <!--[if mso]>
          <h2 style="font-size: 48px; font-weight: 800; color: ${accent.text}; margin: 0 0 12px 0; text-align: center;">
            ${overallScore} <span style="font-size: 20px; color: #71717a; font-weight: 500;">/ 100</span>
          </h2>
          <![endif]-->
          <!--[if !mso]><!-->
          <div style="margin: 0 auto 16px auto; width: 120px; height: 120px; text-align: center;">
            <svg width="120" height="120" viewBox="0 0 120 120" style="display: inline-block;">
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e5e7eb" stroke-width="8" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="${accent.text}"
                stroke-width="8"
                stroke-dasharray="314"
                stroke-dashoffset="${314 - (314 * overallScore) / 100}"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="65" text-anchor="middle" font-size="32px" font-weight="800" fill="${accent.text}">
                ${overallScore}
              </text>
              <text x="60" y="85" text-anchor="middle" font-size="10px" font-weight="700" fill="#71717a">
                / 100
              </text>
            </svg>
          </div>
          <!--<![endif]-->
        ` }} />

        {/* AI-Generated Overall Description */}
        <p style={{
          fontSize: '14px',
          color: '#4b5563',
          margin: '0 0 14px 0',
          lineHeight: '20px',
        }} className="text-secondary">
          {readinessDescription}
        </p>

        {/* Achievement Badge with Percentile Context */}
        <div style={{ marginTop: '14px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: accent.text,
            backgroundColor: accent.backgroundColor,
            border: `1px solid ${accent.text}`,
            padding: '4px 12px',
            borderRadius: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block',
          }}>
            🏅 {badgeName}
          </span>
          {!hidePeerPercentile ? (
            <p style={{
              fontSize: '11px',
              color: '#71717a',
              margin: '6px 0 0 0',
              fontWeight: '600',
            }} className="text-secondary">
              Top {calculatePercentile(scoreInsights.strongest.score)}% among candidates practicing this role.
            </p>
          ) : (
            <p style={{
              fontSize: '11px',
              color: '#71717a',
              margin: '6px 0 0 0',
              fontWeight: '600',
            }} className="text-secondary">
              Session-scoped score-v1.2 — not a peer percentile.
            </p>
          )}
        </div>
      </div>

      {/* Interview Readiness Card (Legally compliant overall metrics card) */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          margin: '20px 0',
          textAlign: 'center',
        }}
        className="score-card"
      >
        <p style={{
          fontSize: '10px',
          fontWeight: '700',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 4px 0',
        }} className="text-secondary">
          Interview Readiness
        </p>
        <p style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#18181b',
          margin: '0 0 4px 0',
          lineHeight: '28px',
        }} className="text-primary">
          {readiness.label}
        </p>
        <p style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#7c3aed',
          margin: '0 0 4px 0',
        }}>
          Score: {overallScore} / 100
        </p>
        <p style={{
          fontSize: '10px',
          color: '#a1a1aa',
          margin: 0,
        }} className="text-secondary">
          *Based on InterviewEra AI Evaluation
        </p>
      </div>

      {/* Gamified Streak Card */}
      <StreakCard streak={streak} />

      {/* Intelligent Score Insights strongest/weakest */}
      <InsightCard
        strongest={scoreInsights.strongest}
        weakest={scoreInsights.weakest}
      />

      {/* Score Comparison Section */}
      <ComparisonSection scores={scores} labels={scoreLabels} role={stats.role} />

      {/* Score Breakdowns */}
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
          Breakdown Scores
        </h3>
        <div style={{ textAlign: 'center', margin: '0 -6px' }}>
          <ScoreCard label={scoreLabels.communication} score={scores.communication} />
          <ScoreCard label={scoreLabels.technical} score={scores.technical} />
          <ScoreCard label={scoreLabels.confidence} score={scores.confidence} />
          <ScoreCard label={scoreLabels.problemSolving} score={scores.problemSolving} />
          <ScoreCard label={scoreLabels.structure} score={scores.structure} />
        </div>
      </div>

      {/* Performance Summary (Strengths & Areas to Improve) */}
      {(summary.strengths.length > 0 || summary.improvements.length > 0) && (
        <SummaryCard
          strengths={summary.strengths}
          improvements={summary.improvements}
        />
      )}

      {/* AI Coach Card */}
      {coachNote && (
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
            🤖 AI Coach
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
            "{coachNote}"
          </p>
        </div>
      )}

      {/* Top 3 Action Items */}
      {actionItems && actionItems.length > 0 && (
        <div style={{ margin: '28px 0' }}>
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
            Top 3 things to improve before your next interview
          </h3>
          <table border={0} cellPadding={0} cellSpacing={0} width="100%">
            {actionItems.slice(0, 3).map((item, idx) => {
              const scoreGains = ['+5 Score', '+3 Score', '+2 Score'];
              return (
                <tr key={idx}>
                  <td
                    valign="top"
                    width="24"
                    style={{
                      paddingBottom: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#7c3aed',
                      lineHeight: '20px',
                    }}
                  >
                    {idx + 1}.
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
                    {item}
                    <span
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#10b981',
                        marginTop: '2px',
                      }}
                    >
                      Estimated gain: {scoreGains[idx]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </table>
        </div>
      )}

      {/* Session Highlights Card */}
      <HighlightsCard highlights={highlights} />

      {/* Improvement Trend since last mock interview */}
      <TrendSection trends={trends} />

      {/* Improvement Roadmap Timeline */}
      <div style={{ margin: '28px 0' }}>
        <h3
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#18181b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 4px 0',
          }}
          className="text-primary"
        >
          Improvement Roadmap
        </h3>
        <ProgressTracker steps={roadmapSteps} />
      </div>

      {/* Interview Statistics */}
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
          Interview Stats
        </h3>
        <table border={0} cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' }}>
          <tr>
            <td style={{ paddingRight: '8px', paddingBottom: '12px' }} width="33.33%">
              <MetricCard label="Duration" value={`${stats.durationMinutes} min`} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px', paddingRight: '8px', paddingBottom: '12px' }} width="33.33%">
              <MetricCard label="Questions" value={stats.totalQuestions} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px', paddingBottom: '12px' }} width="33.33%">
              <MetricCard label="Follow-ups" value={stats.followUpQuestions} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
          </tr>
          <tr>
            <td style={{ paddingRight: '8px' }} width="33.33%">
              <MetricCard label="AI Score" value={`${overallScore}/100`} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px', paddingRight: '8px' }} width="33.33%">
              <MetricCard label="Company" value={stats.company || 'General Target'} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
            <td style={{ paddingLeft: '8px' }} width="33.33%">
              <MetricCard label="Target Role" value={stats.role} style={{ width: '100%', margin: 0, display: 'block' }} />
            </td>
          </tr>
        </table>
      </div>

      {/* AI Next Recommendations with Weakest Skill Context */}
      <RecommendationCard
        role={recommendation.role}
        difficulty={recommendation.difficulty}
        estimatedMinutes={recommendation.estimatedMinutes}
        practiceUrl={recommendation.url}
        weakestSkillName={scoreInsights.weakest.name}
      />

      {/* Action CTA buttons */}
      <CTAButton
        href={reportUrl}
        reassurance="No authentication required to view feedback report"
      >
        View Full Report &rarr;
      </CTAButton>

      <div style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '28px' }}>
        <a
          href="https://interviewera.com/dashboard"
          style={{
            fontSize: '14px',
            color: '#7c3aed',
            textDecoration: 'underline',
            fontWeight: '600',
          }}
        >
          Start Another Interview
        </a>
      </div>

      {/* Sharing options */}
      <ShareSection
        enabled={true}
        reportUrl={shareUrl || reportUrl}
        candidateName={candidateName}
        overallScore={overallScore}
      />
    </EmailLayout>
  );
}
