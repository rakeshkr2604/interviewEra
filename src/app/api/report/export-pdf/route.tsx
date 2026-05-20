import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ReportPDF } from '@/components/report/ReportPDF';
import type { DetailedAnalysis, DimensionScores, PlanTier, QuestionCategory, RadarDataPoint, ReportSpeechSummary, ReportSummary, ScoreJustification } from '@/types/app.types';
import { dimensionDisplayRowsFromRadar, radarScoresByDimensionKey } from '@/lib/utils/report-radar-dimensions';
import { aggregateScoreJustifications } from '@/lib/utils/aggregate-score-justification';
import { generateInsights } from '@/lib/report/insight-engine';
import type { PerQuestionInsightData } from '@/lib/report/insight-engine';

export async function GET(request: Request): Promise<NextResponse | Response> {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json({ error: 'reportId query param required' }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // ── Pro gate ──────────────────────────────────────────────────────────────
    const { data: profile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
    if (planTier !== 'pro' && planTier !== 'campus') {
      return NextResponse.json(
        { error: 'PDF export is a Pro feature. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // ── Fetch report ──────────────────────────────────────────────────────────
    const { data: report } = await serviceClient
      .from('reports')
      .select('id, overall_score, radar_data, interview_id, generated_at, summary')
      .eq('id', reportId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // ── Verify ownership ──────────────────────────────────────────────────────
    const { data: interview } = await serviceClient
      .from('interviews')
      .select('id, user_id, role, difficulty, completed_at')
      .eq('id', report.interview_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // ── Fetch Q&A + evaluations ───────────────────────────────────────────────
    const { data: questions } = await serviceClient
      .from('questions')
      .select('id, question_text, category, order_index')
      .eq('interview_id', interview.id)
      .order('order_index', { ascending: true });

    const questionIds = (questions ?? []).map((q) => q.id as string);

    // submitted_at ascending so the LAST entry per question (the post-follow-up
    // substantive answer) wins when reduced into answerByQuestion below.
    const { data: answers } = await serviceClient
      .from('answers')
      .select('id, question_id, answer_text, submitted_at')
      .in('question_id', questionIds)
      .order('submitted_at', { ascending: true });

    // Most-recent answer per question (a question can have multiple answer rows
    // once the orchestrator asks an in-place follow-up on the same question).
    const answerByQuestion = new Map<string, { id: string; answer_text: string }>();
    for (const a of answers ?? []) {
      answerByQuestion.set(a.question_id as string, {
        id: a.id as string,
        answer_text: (a.answer_text as string) ?? '',
      });
    }

    const answerIds = (answers ?? []).map((a) => a.id as string);

    const { data: evaluations } =
      answerIds.length > 0
        ? await serviceClient
            .from('evaluations')
            .select('answer_id, overall_score, dimension_scores, feedback_text, detailed_analysis')
            .in('answer_id', answerIds)
        : { data: [] };

    // ── Build dimension scores from radar_data (keys + display labels) ─────────
    const radarData = (report.radar_data as RadarDataPoint[]) ?? [];
    const dimensionScores = dimensionDisplayRowsFromRadar(radarData).map(({ label, score }) => ({
      label,
      score,
    }));

    // ── Build question items ──────────────────────────────────────────────────
    const pdfQuestions = (questions ?? []).map((q) => {
      const answer = answerByQuestion.get(q.id as string) ?? null;
      const evaluation = answer
        ? ((evaluations ?? []).find((e) => e.answer_id === answer.id) ?? null)
        : null;
      const detail = evaluation
        ? (evaluation.detailed_analysis as DetailedAnalysis | null)
        : null;

      return {
        orderIndex: q.order_index as number,
        questionText: q.question_text as string,
        category: q.category as QuestionCategory,
        answerText: answer ? answer.answer_text : null,
        overallScore: evaluation ? (evaluation.overall_score as number) : null,
        feedbackText: evaluation ? (evaluation.feedback_text as string) : null,
        strengths: detail?.strengths ?? [],
        improvements: detail?.improvements ?? [],
        modelAnswerHint: detail?.model_answer_hint ?? null,
      };
    });

    const perAnswerJustifications: ScoreJustification[] = (evaluations ?? []).flatMap((e) => {
      const d = e.detailed_analysis as DetailedAnalysis | null | undefined;
      const j = d?.score_justification;
      return j && typeof j.why_this_score === 'string' && j.why_this_score.trim() ? [j] : [];
    });
    const scoreJustification = aggregateScoreJustifications(perAnswerJustifications);

    const speechSummary =
      (report.summary as ReportSummary | null)?.speech as ReportSpeechSummary | null ?? null;

    // Compute AI insights from evaluation data (zero extra API calls)
    const partialDimAvgs = radarScoresByDimensionKey(radarData);
    const dimensionAverages: DimensionScores = {
      communication_clarity: partialDimAvgs.communication_clarity ?? 5,
      technical_depth:       partialDimAvgs.technical_depth ?? 5,
      answer_structure:      partialDimAvgs.answer_structure ?? 5,
      confidence:            partialDimAvgs.confidence ?? 5,
      relevance:             partialDimAvgs.relevance ?? 5,
    };
    const pdfPerQuestions: PerQuestionInsightData[] = (questions ?? []).flatMap((q) => {
      const answer = answerByQuestion.get(q.id as string) ?? null;
      const evaluation = answer
        ? ((evaluations ?? []).find((e) => e.answer_id === answer.id) ?? null)
        : null;
      if (!evaluation) return [];
      const detail = evaluation.detailed_analysis as DetailedAnalysis | null;
      return [{
        category: q.category as string,
        score: evaluation.overall_score as number,
        feedbackText: (evaluation.feedback_text as string) ?? '',
        strengths: detail?.strengths ?? [],
        improvements: detail?.improvements ?? [],
        dimensionScores: (evaluation.dimension_scores as DimensionScores | null) ?? null,
      }];
    });
    const insights = generateInsights({
      overallScore:      report.overall_score as number,
      dimensionAverages,
      perQuestions:      pdfPerQuestions,
      speechSummary,
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

    // ── Render PDF ────────────────────────────────────────────────────────────
    const pdfBuffer = await renderToBuffer(
      <ReportPDF
        role={interview.role as string}
        difficulty={interview.difficulty as string}
        completedAt={completedAt}
        overallScore={report.overall_score as number}
        dimensionScores={dimensionScores}
        questions={pdfQuestions}
        scoreJustification={scoreJustification}
        speechSummary={speechSummary}
        insights={insights}
      />
    );

    const filename = `InterviewEra-Report-${(interview.role as string).replace(/\s+/g, '-')}-${reportId.slice(0, 8)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[report/export-pdf] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF.' }, { status: 500 });
  }
}
