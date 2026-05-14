import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ReportPDF } from '@/components/report/ReportPDF';
import type { DetailedAnalysis, PlanTier, QuestionCategory, RadarDataPoint, ScoreJustification } from '@/types/app.types';
import { dimensionDisplayRowsFromRadar } from '@/lib/utils/report-radar-dimensions';
import { aggregateScoreJustifications } from '@/lib/utils/aggregate-score-justification';

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
      .select('id, overall_score, radar_data, interview_id, generated_at')
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

    const { data: answers } = await serviceClient
      .from('answers')
      .select('id, question_id')
      .in('question_id', questionIds);

    const answerIds = (answers ?? []).map((a) => a.id as string);

    const { data: evaluations } =
      answerIds.length > 0
        ? await serviceClient
            .from('evaluations')
            .select(
              'answer_id, overall_score, dimension_scores, feedback_text, detailed_analysis'
            )
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
      const answer = (answers ?? []).find((a) => a.question_id === q.id) ?? null;
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
