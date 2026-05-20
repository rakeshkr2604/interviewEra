import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores, RadarDataPoint, ReportSummary, ReportSpeechSummary } from '@/types/app.types';
import type { FillerAnalysis } from '@/lib/filler-words/analyze';
import { analyzeFillerWords } from '@/lib/filler-words/analyze';
import { FILLER_THRESHOLDS, FILLER_MESSAGES } from '@/lib/filler-words/config';

export interface ReportGenerationResult {
  reportId: string;
  overallScore: number;
  radarData: RadarDataPoint[];
  trendData: RadarDataPoint[] | null;
}

/** Approximate conversational speaking rate — fallback when duration_seconds is absent. */
const FALLBACK_WPM = 130;

/** Build the aggregate speech summary from per-answer stored metrics.
 *  Uses exact duration_seconds when available; falls back to FALLBACK_WPM estimate per answer. */
function buildSpeechSummary(
  answers: {
    answer_text: string | null;
    duration_seconds: number | null;
    speech_metrics: FillerAnalysis | null;
  }[],
): ReportSpeechSummary {
  let totalFillerCount = 0;
  let totalDurationSeconds = 0;
  let totalWords = 0;
  const fillerMap = new Map<string, number>();
  let answersWithMetrics = 0;
  let hasEstimated = false;

  for (const answer of answers) {
    const text = answer.answer_text ?? '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    const stored = answer.speech_metrics;
    const storedDuration = answer.duration_seconds;

    if (stored !== null) {
      answersWithMetrics++;
      totalFillerCount += stored.count;
      // Prefer the authoritative stored duration; estimate from words if absent.
      const dur =
        storedDuration != null
          ? storedDuration
          : Math.max(Math.ceil((wordCount / FALLBACK_WPM) * 60), 1);
      if (storedDuration == null) hasEstimated = true;
      totalDurationSeconds += dur;
      for (const f of stored.words) {
        fillerMap.set(f.word, (fillerMap.get(f.word) ?? 0) + f.occurrences);
      }
    } else {
      // No stored metrics for this answer — estimate from text.
      hasEstimated = true;
      const estimatedDuration = Math.max(Math.ceil((wordCount / FALLBACK_WPM) * 60), 1);
      totalDurationSeconds += estimatedDuration;
      if (text) {
        const a = analyzeFillerWords(text, estimatedDuration);
        totalFillerCount += a.count;
        for (const f of a.words) {
          fillerMap.set(f.word, (fillerMap.get(f.word) ?? 0) + f.occurrences);
        }
      }
    }
  }

  const durationMinutes = Math.max(totalDurationSeconds / 60, 0.1);
  const ratePerMinute = Math.round(totalFillerCount / durationMinutes);

  let severity: 'safe' | 'warning' | 'severe' = 'safe';
  if (ratePerMinute >= FILLER_THRESHOLDS.severe) severity = 'severe';
  else if (ratePerMinute >= FILLER_THRESHOLDS.warning) severity = 'warning';

  const source: ReportSpeechSummary['source'] =
    answersWithMetrics === 0
      ? 'estimated'
      : hasEstimated
        ? 'partial'
        : 'stored';

  return {
    total_filler_count: totalFillerCount,
    total_duration_seconds: totalDurationSeconds,
    rate_per_minute: ratePerMinute,
    severity,
    message: FILLER_MESSAGES[severity],
    percentage: totalWords > 0 ? Math.round((totalFillerCount / totalWords) * 100) : 0,
    top_fillers: Array.from(fillerMap.entries())
      .map(([word, occurrences]) => ({ word, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences),
    answers_with_metrics: answersWithMetrics,
    total_answers: answers.length,
    source,
  };
}

export async function aggregateReport(
  interviewId: string,
  userId: string
): Promise<ReportGenerationResult> {
  const supabase = createServiceClient();

  // Fetch all questions for this interview
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id')
    .eq('interview_id', interviewId);

  if (qError || !questions || questions.length === 0) {
    throw new Error('No questions found for interview');
  }

  const questionIds = questions.map((q) => q.id as string);

  // Fetch answers with speech metric columns (null-safe — new columns may be absent on old rows)
  const { data: answers, error: aError } = await supabase
    .from('answers')
    .select('id, question_id, answer_text, duration_seconds, speech_metrics')
    .in('question_id', questionIds);

  if (aError || !answers || answers.length === 0) {
    throw new Error('No answers found for interview');
  }

  const answerIds = answers.map((a) => a.id as string);

  // Fetch all evaluations
  const { data: evaluations, error: eError } = await supabase
    .from('evaluations')
    .select('overall_score, dimension_scores')
    .in('answer_id', answerIds);

  if (eError || !evaluations || evaluations.length === 0) {
    throw new Error('No evaluations found for interview');
  }

  // Calculate overall score (mean of all evaluation scores)
  const overallScore =
    evaluations.reduce((sum, e) => sum + (e.overall_score as number), 0) /
    evaluations.length;

  // Calculate per-dimension averages
  const dimSums: DimensionScores = {
    communication_clarity: 0,
    technical_depth: 0,
    answer_structure: 0,
    confidence: 0,
    relevance: 0,
  };

  for (const ev of evaluations) {
    const d = ev.dimension_scores as DimensionScores;
    dimSums.communication_clarity += d.communication_clarity;
    dimSums.technical_depth += d.technical_depth;
    dimSums.answer_structure += d.answer_structure;
    dimSums.confidence += d.confidence;
    dimSums.relevance += d.relevance;
  }

  const n = evaluations.length;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  const radarData: RadarDataPoint[] = [
    { dimension: 'communication_clarity', score: round1(dimSums.communication_clarity / n) },
    { dimension: 'technical_depth', score: round1(dimSums.technical_depth / n) },
    { dimension: 'answer_structure', score: round1(dimSums.answer_structure / n) },
    { dimension: 'confidence', score: round1(dimSums.confidence / n) },
    { dimension: 'relevance', score: round1(dimSums.relevance / n) },
  ];

  // Build deterministic speech summary from stored per-answer data
  const speechSummary = buildSpeechSummary(
    answers.map((a) => ({
      answer_text: a.answer_text as string | null,
      duration_seconds: a.duration_seconds as number | null,
      speech_metrics: a.speech_metrics as FillerAnalysis | null,
    })),
  );

  const summary: ReportSummary = { speech: speechSummary };

  console.info('[report/generate] speech_summary', {
    interviewId,
    source: speechSummary.source,
    answersWithMetrics: speechSummary.answers_with_metrics,
    totalAnswers: speechSummary.total_answers,
    ratePerMinute: speechSummary.rate_per_minute,
    severity: speechSummary.severity,
  });

  // Fetch trend data: up to 4 prior completed reports + current interview as final point.
  // Only set trendData when there is at least 1 prior interview (so chart has >= 2 points).
  let trendData: RadarDataPoint[] | null = null;

  const { data: userInterviews } = await supabase
    .from('interviews')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('id', interviewId);

  if (userInterviews && userInterviews.length > 0) {
    const prevInterviewIds = userInterviews.map((i) => i.id as string);

    const { data: prevReports } = await supabase
      .from('reports')
      .select('overall_score, generated_at')
      .in('interview_id', prevInterviewIds)
      .order('generated_at', { ascending: true })
      .limit(4); // cap at 4 prior + 1 current = 5 total points

    if (prevReports && prevReports.length > 0) {
      const priorPoints = prevReports.map((r, i) => ({
        dimension: `Interview ${i + 1}`,
        score: round1(r.overall_score as number),
      }));
      // Append current interview as the final point
      trendData = [
        ...priorPoints,
        { dimension: `Interview ${priorPoints.length + 1}`, score: round1(overallScore) },
      ];
    }
  }

  // Insert report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      interview_id: interviewId,
      overall_score: round1(overallScore),
      radar_data: radarData,
      trend_data: trendData,
      summary,
    })
    .select('id')
    .single();

  if (reportError || !report) {
    throw new Error(`Failed to insert report: ${reportError?.message ?? 'unknown'}`);
  }

  return {
    reportId: report.id as string,
    overallScore: round1(overallScore),
    radarData,
    trendData,
  };
}
