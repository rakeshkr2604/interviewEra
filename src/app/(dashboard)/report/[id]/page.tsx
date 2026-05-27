import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata';
import { Badge } from '@/components/ui/badge';
import { ScoreCard } from '@/components/report/ScoreCard';
import { ReportPanel } from '@/components/report/ReportPanel';
import { BlurredSection } from '@/components/report/BlurredSection';
import { ShareCard } from '@/components/report/ShareCard';
import { ReportViewTracker } from '@/components/report/ReportViewTracker';
import { RadarChart, TrendChart } from '@/components/report/ReportDynamicCharts';
import type {
  PlanTier,
  RadarDataPoint,
  DetailedAnalysis,
  QuestionCategory,
  QuestionRubric,
  ScoreJustification,
  ReportSummary,
  ReportSpeechSummary,
  DimensionScores,
  ReportInsights,
} from '@/types/app.types';
import { aggregateScoreJustifications } from '@/lib/utils/aggregate-score-justification';
import { ExecutiveSummaryPanel } from '@/components/report/ExecutiveSummaryPanel';
import { generateInsights } from '@/lib/report/insight-engine';
import type { PerQuestionInsightData } from '@/lib/report/insight-engine';
import { radarScoresByDimensionKey } from '@/lib/utils/report-radar-dimensions';
import { sessionQualityFeedbackFromLogRow } from '@/lib/retention/quality-feedback';
import { SessionQualityNotice } from '@/components/retention/SessionQualityNotice';

const exportPdfLinkClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 px-3 text-sm font-semibold whitespace-nowrap transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]';

const exportPdfLinkStyle: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
  color: 'var(--text-primary)',
};

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: 'Score report',
    description: 'Detailed feedback and scores for your completed mock interview.',
    path: `/report/${id}`,
    noIndex: true,
  });
}

const CATEGORY_BADGE_STYLE: Record<QuestionCategory, CSSProperties> = {
  technical: {
    background: 'color-mix(in srgb, #3b82f6 18%, transparent)',
    color: 'var(--text-primary)',
  },
  behavioral: {
    background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
    color: 'var(--accent-primary)',
  },
  situational: {
    background: 'color-mix(in srgb, var(--accent-warning) 20%, transparent)',
    color: 'var(--text-primary)',
  },
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch report
  const { data: report } = await supabase
    .from('reports')
    .select('id, overall_score, radar_data, trend_data, interview_id, generated_at, summary')
    .eq('id', id)
    .maybeSingle();

  if (!report) {
    notFound();
  }

  // Verify ownership + fetch interview metadata + user profile (parallel)
  const [{ data: interview }, { data: profile }] = await Promise.all([
    supabase
      .from('interviews')
      .select('id, user_id, role, difficulty, completed_at')
      .eq('id', report.interview_id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('users').select('plan_tier').eq('id', user.id).single(),
  ]);

  if (!interview) {
    notFound();
  }

  const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
  const canSeeDetails = planTier === 'pro' || planTier === 'campus';

  const { data: sessionQualityRow } = await supabase
    .from('session_quality_log')
    .select(
      'interview_id, session_score, questions_answered, total_questions, avg_answer_duration_sec, quality_met',
    )
    .eq('interview_id', report.interview_id)
    .maybeSingle();

  const sessionQualityFeedback = sessionQualityRow
    ? sessionQualityFeedbackFromLogRow({
        interview_id: sessionQualityRow.interview_id as string,
        session_score: Number(sessionQualityRow.session_score),
        questions_answered: Number(sessionQualityRow.questions_answered),
        total_questions: Number(sessionQualityRow.total_questions),
        avg_answer_duration_sec: Number(sessionQualityRow.avg_answer_duration_sec),
        quality_met: Boolean(sessionQualityRow.quality_met),
      })
    : null;

  // Fetch per-question breakdown (include rubric for keyword analysis)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text, category, order_index, rubric')
    .eq('interview_id', interview.id)
    .order('order_index', { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id as string);

  // Order by submitted_at ascending so later answers (post-follow-up) overwrite earlier ones
  // This matches the PDF export logic and ensures we show the final evaluated answer
  const { data: rawAnswers } = await supabase
    .from('answers')
    .select('id, question_id, answer_text, submitted_at')
    .in('question_id', questionIds)
    .order('submitted_at', { ascending: true });

  // Keep only the LATEST answer per question (follow-ups create multiple answer rows)
  const answerByQuestion = new Map<string, { id: string; question_id: string; answer_text: string }>();
  for (const a of rawAnswers ?? []) {
    answerByQuestion.set(a.question_id as string, {
      id: a.id as string,
      question_id: a.question_id as string,
      answer_text: (a.answer_text as string) ?? '',
    });
  }
  const answers = Array.from(answerByQuestion.values());
  const answerIds = answers.map((a) => a.id);

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('answer_id, overall_score, feedback_text, detailed_analysis, dimension_scores')
    .in('answer_id', answerIds);

  const perAnswerJustifications: ScoreJustification[] = (evaluations ?? []).flatMap((e) => {
    const d = e.detailed_analysis as DetailedAnalysis | null | undefined;
    const j = d?.score_justification;
    return j && typeof j.why_this_score === 'string' && j.why_this_score.trim() ? [j] : [];
  });
  const reportScoreJustification = aggregateScoreJustifications(perAnswerJustifications);

  // ── Speech analytics ────────────────────────────────────────────────────
  // Read the deterministic summary persisted at report generation time.
  // Old reports (pre-Phase B) have no summary — show '—', no estimated data.
  const storedSpeech = (report.summary as ReportSummary | null)?.speech as ReportSpeechSummary | null ?? null;

  const sessionDurationLabel: string | null = storedSpeech
    ? (() => {
        const t = storedSpeech.total_duration_seconds;
        const m = Math.floor(t / 60);
        const s = t % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
      })()
    : null;

  // Build breakdown — compute keyword counts from raw data regardless of plan tier
  const breakdown = (questions ?? []).map((q) => {
    const answer = answerByQuestion.get(q.id as string) ?? null;
    const rawEval = answer
      ? ((evaluations ?? []).find((e) => e.answer_id === answer.id) ?? null)
      : null;
    const rawDetailedAnalysis = rawEval
      ? (rawEval.detailed_analysis as DetailedAnalysis | null)
      : null;

    // Keyword counts always available (used even for non-Pro to show count in upgrade label)
    const keywordsMissingRaw = rawDetailedAnalysis?.keywords_missing ?? [];
    const rubric = q.rubric as QuestionRubric | null;
    const idealKeywords = rubric?.ideal_keywords ?? [];

    return {
      question: q,
      answer,
      evaluation: rawEval
        ? {
            overall_score: rawEval.overall_score as number,
            feedback_text: rawEval.feedback_text as string,
            // Redact detailed_analysis server-side for non-Pro users
            detailed_analysis: canSeeDetails ? rawDetailedAnalysis : null,
          }
        : null,
      keywords: {
        // Only expose full arrays to Pro; non-Pro gets empty arrays (content hidden behind blur)
        used: canSeeDetails
          ? idealKeywords.filter((k) => !keywordsMissingRaw.includes(k))
          : [],
        missing: canSeeDetails ? keywordsMissingRaw : [],
        missingCount: keywordsMissingRaw.length, // Always available for upgrade label
      },
    };
  });

  const radarData = report.radar_data as RadarDataPoint[];
  const trendData = report.trend_data as RadarDataPoint[] | null;

  // Compute AI insights from evaluation data (zero extra API calls)
  const partialDimAvgs = radarScoresByDimensionKey(radarData);
  const dimensionAverages: DimensionScores = {
    communication_clarity: partialDimAvgs.communication_clarity ?? 5,
    technical_depth:       partialDimAvgs.technical_depth ?? 5,
    answer_structure:      partialDimAvgs.answer_structure ?? 5,
    confidence:            partialDimAvgs.confidence ?? 5,
    relevance:             partialDimAvgs.relevance ?? 5,
  };
  const perQuestions: PerQuestionInsightData[] = (questions ?? []).flatMap((q) => {
    const answer = answerByQuestion.get(q.id as string) ?? null;
    const rawEval = answer ? ((evaluations ?? []).find((e) => e.answer_id === answer.id) ?? null) : null;
    if (!rawEval) return [];
    const detail = rawEval.detailed_analysis as DetailedAnalysis | null;
    return [{
      category: q.category as string,
      score: rawEval.overall_score as number,
      feedbackText: (rawEval.feedback_text as string) ?? '',
      strengths: detail?.strengths ?? [],
      improvements: detail?.improvements ?? [],
      dimensionScores: (rawEval.dimension_scores as DimensionScores | null) ?? null,
    }];
  });
  const insights: ReportInsights = generateInsights({
    overallScore:      report.overall_score as number,
    dimensionAverages,
    perQuestions,
    speechSummary:     storedSpeech,
    role:              interview.role as string,
    difficulty:        interview.difficulty as string,
  });

  const completedAt = interview.completed_at
    ? new Date(interview.completed_at as string).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="w-full max-w-[min(100%,1600px)] space-y-8 pb-4">
      <ReportViewTracker
        overallScore={report.overall_score as number}
        userPlan={planTier}
        interviewId={interview.id as string}
      />

      {sessionQualityFeedback ? (
        <SessionQualityNotice feedback={sessionQualityFeedback} />
      ) : null}

      <DashboardPageHeader
        eyebrow="Insights"
        title="Interview report"
        subtitle={`${interview.role as string} · ${interview.difficulty as string} difficulty`}
        backHref="/history"
        backLabel="Interview history"
        action={
          canSeeDetails ? (
            <a
              href={`/api/report/export-pdf?reportId=${id}`}
              download
              className={exportPdfLinkClass}
              style={exportPdfLinkStyle}
            >
              Export PDF
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Export PDF
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--accent-warning) 22%, transparent)',
                  color: 'var(--accent-warning)',
                }}
              >
                Pro
              </span>
            </div>
          )
        }
      />

      {/* AI Executive Summary */}
      <ExecutiveSummaryPanel insights={insights} />

      {/* Score + Radar */}
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <ScoreCard
            overallScore={report.overall_score as number}
            role={interview.role as string}
            completedAt={completedAt}
            scoreJustification={reportScoreJustification}
          />
        </div>
        <ReportPanel
          className="lg:col-span-8"
          eyebrow="Performance"
          title="Dimension breakdown"
          contentClassName="min-h-[260px]"
        >
          <RadarChart data={radarData} />
        </ReportPanel>
      </div>

      {trendData && trendData.length >= 2 && (
        <ReportPanel eyebrow="Progress" title="Your trend across interviews">
          <TrendChart data={trendData} />
        </ReportPanel>
      )}

      <ReportPanel eyebrow="Delivery" title="Speech patterns" contentClassName="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Filler word analysis from your interview session. Industry benchmark: fewer than 3 filler words per
          minute.
        </p>
        <div className="grid gap-3 text-center grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: 'Filler Words',
              value: storedSpeech ? String(storedSpeech.total_filler_count) : '—',
              hint: storedSpeech ? `${storedSpeech.percentage}% of words` : 'Unavailable',
            },
            {
              label: 'Rate / min',
              value: storedSpeech ? String(storedSpeech.rate_per_minute) : '—',
              hint: 'Benchmark: <3',
            },
            {
              label: 'Pattern',
              value: storedSpeech
                ? storedSpeech.severity.charAt(0).toUpperCase() + storedSpeech.severity.slice(1)
                : '—',
              hint: 'Safe / Warning / Severe',
            },
            {
              label: 'Duration',
              value: sessionDurationLabel ?? '—',
              hint: storedSpeech ? 'Total speaking time' : 'Unavailable',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border-2 p-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 75%, transparent)',
              }}
            >
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {item.hint}
              </p>
            </div>
          ))}
        </div>

        {storedSpeech && storedSpeech.top_fillers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
              Top fillers:
            </span>
            {storedSpeech.top_fillers.slice(0, 5).map(({ word, occurrences }) => (
              <span
                key={word}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
                style={{
                  background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                {word} ×{occurrences}
              </span>
            ))}
          </div>
        )}

        {storedSpeech ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {storedSpeech.message}
            {storedSpeech.source !== 'stored' && (
              <span> · Duration partially estimated for some answers</span>
            )}
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Speech data not available for this report.
          </p>
        )}
      </ReportPanel>

      {/* AI Candidate Intelligence — Pro-gated */}
      <ReportPanel eyebrow="Intelligence" title="AI hiring intelligence" contentClassName="space-y-6">
        <BlurredSection
          userTier={planTier}
          requiredTier="pro"
          upgradeLabel="Upgrade to Pro to unlock AI hiring intelligence"
        >
          <div className="space-y-6">
            {insights.behavioral_patterns.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Behavioral Patterns
                </p>
                <ul className="space-y-2">
                  {insights.behavioral_patterns.map((pattern, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: 'var(--accent-primary)' }}>◆</span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Communication Intelligence
              </p>
              <p className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {insights.communication.clarity_narrative}
              </p>
              <p className="mb-3 text-sm leading-relaxed italic" style={{ color: 'var(--text-muted)' }}>
                {insights.communication.confidence_progression}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.communication.strengths.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--accent-success)' }}>Strengths</p>
                    <ul className="space-y-1">
                      {insights.communication.strengths.map((s, i) => (
                        <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.communication.weaknesses.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--accent-danger)' }}>To improve</p>
                    <ul className="space-y-1">
                      {insights.communication.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Technical Intelligence
              </p>
              <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {insights.technical.depth_assessment}
              </p>
              {(insights.technical.strength_patterns.length > 0 || insights.technical.weak_patterns.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {insights.technical.strength_patterns.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--accent-success)' }}>Patterns</p>
                      <ul className="space-y-1">
                        {insights.technical.strength_patterns.map((s, i) => (
                          <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insights.technical.weak_patterns.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--accent-danger)' }}>Gaps</p>
                      <ul className="space-y-1">
                        {insights.technical.weak_patterns.map((w, i) => (
                          <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="rounded-xl border-2 p-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              }}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Benchmarking
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                  {insights.benchmarking.percentile_estimate}th
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  percentile
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {insights.benchmarking.comparison_narrative}
              </p>
              <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {insights.benchmarking.role_calibration}
              </p>
            </div>
          </div>
        </BlurredSection>
      </ReportPanel>

      <div className="space-y-6">
        <div
          className="flex flex-col gap-2 border-b-2 pb-4 sm:flex-row sm:items-end sm:justify-between"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
              style={{ color: 'var(--accent-primary)' }}
            >
              Breakdown
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Question by question
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {breakdown.length} questions · your answers and AI feedback
          </p>
        </div>
        {breakdown.map((item, idx) => (
          <div key={item.question.id} className="dashboard-premium-card overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-12">
              <div
                className="space-y-4 border-b p-5 md:p-6 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-8"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <Badge
                    className="border-0 text-xs font-medium capitalize"
                    style={CATEGORY_BADGE_STYLE[item.question.category as QuestionCategory]}
                  >
                    {item.question.category}
                  </Badge>
                </div>
                <p className="font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {item.question.question_text}
                </p>
                {item.answer && (
                  <div
                    className="rounded-xl border-2 p-4 text-sm"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <p
                      className="mb-2 text-xs font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Your answer
                    </p>
                    <p className="leading-relaxed">{item.answer.answer_text}</p>
                  </div>
                )}
                {item.evaluation ? (
                  <div
                    className="rounded-xl border-2 p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Score{' '}
                      <span
                        style={{
                          color:
                            item.evaluation.overall_score >= 7
                              ? 'var(--accent-success)'
                              : item.evaluation.overall_score >= 5
                                ? 'var(--accent-warning)'
                                : 'var(--accent-danger)',
                        }}
                      >
                        {item.evaluation.overall_score.toFixed(1)} / 10
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Evaluation not available for this answer.
                  </p>
                )}
              </div>

              <div className="space-y-4 p-5 md:p-6 lg:col-span-7 lg:p-8">
                {item.evaluation ? (
                  <div className="space-y-2">
                    <p
                      className="text-xs font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Feedback
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {item.evaluation.feedback_text}
                    </p>
                  </div>
                ) : null}

                {item.evaluation && (
                  <BlurredSection
                    userTier={planTier}
                    requiredTier="pro"
                    upgradeLabel="Upgrade to Pro to unlock detailed analysis"
                  >
                    <div className="space-y-3 text-sm">
                      {item.evaluation.detailed_analysis ? (
                        <>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              Strengths
                            </p>
                            <ul
                              className="mt-1 list-inside list-disc space-y-0.5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {item.evaluation.detailed_analysis.strengths.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              Improvements
                            </p>
                            <ul
                              className="mt-1 list-inside list-disc space-y-0.5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {item.evaluation.detailed_analysis.improvements.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              Strengths
                            </p>
                            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                              Communicates clearly and uses relevant examples from experience.
                            </p>
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              Improvements
                            </p>
                            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                              Could improve technical depth and structure answers more concisely.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </BlurredSection>
                )}

                {item.evaluation && (
                  <BlurredSection
                    userTier={planTier}
                    requiredTier="pro"
                    upgradeLabel="Upgrade to Pro to see model answers"
                  >
                    <div
                      className="rounded-xl border-2 p-4 text-sm"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                        background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                      }}
                    >
                      <p className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        Model answer
                      </p>
                      <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {item.evaluation.detailed_analysis
                          ? item.evaluation.detailed_analysis.model_answer_hint
                          : 'A strong answer would clearly state the key concept, provide a concrete real-world example demonstrating practical application, and conclude with measurable impact or outcome.'}
                      </p>
                    </div>
                  </BlurredSection>
                )}

                {item.evaluation && (
                  <BlurredSection
                    userTier={planTier}
                    requiredTier="pro"
                    upgradeLabel={
                      item.keywords.missingCount > 0
                        ? `See all ${item.keywords.missingCount} missing keywords — Upgrade to Pro`
                        : 'Upgrade to Pro to see keyword analysis'
                    }
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Keyword analysis
                      </p>
                      {canSeeDetails ? (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {item.keywords.used.map((k) => (
                              <span
                                key={k}
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{
                                  background: 'color-mix(in srgb, var(--accent-success) 20%, transparent)',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {k}
                              </span>
                            ))}
                            {item.keywords.missing.map((k) => (
                              <span
                                key={k}
                                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{
                                  background: 'color-mix(in srgb, var(--accent-danger) 16%, transparent)',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                          {(item.keywords.used.length > 0 || item.keywords.missing.length > 0) && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span className="font-bold" style={{ color: 'var(--accent-success)' }}>
                                ■
                              </span>{' '}
                              Used by you &nbsp;&nbsp;
                              <span className="font-bold" style={{ color: 'var(--accent-danger)' }}>
                                ■
                              </span>{' '}
                              Missed
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {['key term', 'methodology', 'framework'].map((k) => (
                            <span
                              key={k}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                background: 'color-mix(in srgb, var(--accent-danger) 16%, transparent)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </BlurredSection>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Improvement Roadmap — Pro-gated */}
      <ReportPanel eyebrow="Growth plan" title="Your 30-day improvement roadmap" contentClassName="space-y-5">
        <BlurredSection
          userTier={planTier}
          requiredTier="pro"
          upgradeLabel="Upgrade to Pro to unlock your personalized improvement roadmap"
        >
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Focus Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {insights.improvement_roadmap.focus_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>
                  This week
                </p>
                <ul className="space-y-3">
                  {insights.improvement_roadmap.week_1.map((action, i) => (
                    <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{i + 1}. </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>
                  30-day plan
                </p>
                <ul className="space-y-3">
                  {insights.improvement_roadmap.month_1.map((action, i) => (
                    <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{i + 1}. </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </BlurredSection>
      </ReportPanel>

      {/* Share card */}
      <ShareCard
        overallScore={report.overall_score as number}
        role={interview.role as string}
        reportId={interview.id as string}
      />

      {/* Practice again CTA */}
      <div
        className="rounded-2xl border-2 p-6 text-center sm:p-8"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg))',
        }}
      >
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Ready to improve your score?
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Each session targets your weak areas. Consistent practice builds placement readiness.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--accent-primary)' }}
          >
            Start Another Interview
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-2.5 text-sm font-semibold transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            View All Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
