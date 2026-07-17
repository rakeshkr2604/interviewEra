import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ScriptReportPDF } from '@/components/report/ScriptReportPDF';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';
import { canExportScriptReportPdf } from '@/lib/interview/script-report/access';
import { buildScriptSpeechSummary } from '@/lib/interview/script-report/speech';
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate';
import type { ScriptReportSynthesis } from '@/lib/interview/script-report/synthesis';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';
import type { PlanTier } from '@/types/app.types';

function asSynthesis(raw: unknown): ScriptReportSynthesis | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as ScriptReportSynthesis;
  if (
    typeof s.recruiter_assessment !== 'string' ||
    !Array.isArray(s.hiring_signals) ||
    !Array.isArray(s.roadmap_30_day)
  ) {
    return null;
  }
  return s;
}

export async function GET(request: Request): Promise<NextResponse | Response> {
  try {
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId query param required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
    if (!canExportScriptReportPdf(planTier)) {
      return NextResponse.json(
        { error: 'PDF export is a Pro feature. Please upgrade your plan.' },
        { status: 403 },
      );
    }

    const result = await loadOrGenerateScriptReport({
      serviceClient,
      interviewId,
      userId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const report = result.report;
    if (
      report.status === 'generating' ||
      report.status === 'insufficient_data' ||
      report.status === 'failed' ||
      report.overall == null ||
      !report.dimension_averages
    ) {
      return NextResponse.json(
        { error: 'Report is not ready for PDF export yet.' },
        { status: 409 },
      );
    }

    const { data: interview } = await serviceClient
      .from('interviews')
      .select('role, completed_at')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const speechSummary = buildScriptSpeechSummary(
      report.per_question.map((q) => ({ transcript: q.transcript })),
    );

    const buffer = await renderToBuffer(
      <ScriptReportPDF
        role={(interview.role as string) || 'Interview'}
        completedAt={formatDateTimeEnIn(interview.completed_at ?? report.generated_at)}
        overall={Number(report.overall)}
        scoreBand={report.score_band ?? ''}
        placementSignal={report.placement_signal ?? ''}
        dimensionAverages={report.dimension_averages as Record<DimensionKey, number>}
        scoredAnswerCount={report.scored_answer_count}
        synthesis={asSynthesis(report.synthesis)}
        speechSummary={speechSummary}
        perQuestion={report.per_question}
        includeModelAnswers
      />,
    );

    const filename = `interviewera-script-report-${interviewId.slice(0, 8)}.pdf`;
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[script-report/export-pdf]', err);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
