import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores, RadarDataPoint } from '@/types/app.types';

export interface ReportGenerationResult {
  reportId: string;
  overallScore: number;
  radarData: RadarDataPoint[];
  trendData: RadarDataPoint[] | null;
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

  // Fetch all answers
  const { data: answers, error: aError } = await supabase
    .from('answers')
    .select('id, question_id')
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
