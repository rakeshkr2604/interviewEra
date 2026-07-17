import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReportSpeechSummary } from '@/types/app.types';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { dimensionLabel } from '@/lib/interview/script-report/aggregate';
import type { PerQuestionReportRow } from '@/lib/interview/script-report/aggregate';
import type { ScriptReportSynthesis } from '@/lib/interview/script-report/synthesis';

export interface ScriptReportPDFProps {
  role: string;
  completedAt: string;
  overall: number;
  scoreBand: string;
  placementSignal: string;
  dimensionAverages: Record<DimensionKey, number>;
  scoredAnswerCount: number;
  synthesis: ScriptReportSynthesis | null;
  speechSummary: ReportSpeechSummary | null;
  perQuestion: PerQuestionReportRow[];
  includeModelAnswers: boolean;
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 44, paddingVertical: 36, fontFamily: 'Helvetica', fontSize: 10 },
  brand: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 3 },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#6b7280', marginBottom: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 10 },
  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  scoreBig: { fontSize: 42, fontFamily: 'Helvetica-Bold', color: '#059669', lineHeight: 1 },
  body: { fontSize: 10, color: '#374151', lineHeight: 1.55, marginBottom: 6 },
  muted: { fontSize: 8, color: '#6b7280', lineHeight: 1.4 },
  dimRow: { marginBottom: 5 },
  dimLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  dimLabel: { fontSize: 9, color: '#374151' },
  dimValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  barTrack: { backgroundColor: '#e5e7eb', borderRadius: 4, height: 5 },
  barFill: { borderRadius: 4, height: 5, backgroundColor: '#6366f1' },
  qBlock: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  qTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#9ca3af' },
});

function dimColor(score: number): string {
  if (score >= 7) return '#059669';
  if (score >= 5) return '#d97706';
  return '#dc2626';
}

function Footer({ role }: { role: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>InterviewEra · {role} · score-v1.2</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function ScriptReportPDF({
  role,
  completedAt,
  overall,
  scoreBand,
  placementSignal,
  dimensionAverages,
  scoredAnswerCount,
  synthesis,
  speechSummary,
  perQuestion,
  includeModelAnswers,
}: ScriptReportPDFProps) {
  return (
    <Document title={`InterviewEra Report — ${role}`} author="InterviewEra">
      <Page size="A4" style={s.page}>
        <Footer role={role} />
        <Text style={s.brand}>INTERVIEWERA · V2.1 REPORT</Text>
        <Text style={s.title}>Interview report</Text>
        <Text style={s.subtitle}>
          {role} · Completed {completedAt} · {scoredAnswerCount} scored answers
        </Text>
        <View style={s.divider} />

        <Text style={s.eyebrow}>Session score</Text>
        <Text style={[s.scoreBig, { color: dimColor(overall) }]}>{overall.toFixed(1)} / 10</Text>
        <Text style={s.body}>
          Band: {scoreBand.replace(/_/g, ' ')} · Signal: {placementSignal.replace(/_/g, ' ')}
        </Text>
        <Text style={s.muted}>
          Session-scoped only — not a percentile vs other candidates, and not a hiring guarantee.
        </Text>

        <View style={s.divider} />
        <Text style={s.eyebrow}>Dimension averages</Text>
        <Text style={s.sectionTitle}>score-v1.2 breakdown</Text>
        {DIMENSION_KEYS.map((key) => {
          const value = Number(dimensionAverages[key]) || 0;
          const pct = Math.max(0, Math.min(100, (value / 10) * 100));
          return (
            <View key={key} style={s.dimRow}>
              <View style={s.dimLabelRow}>
                <Text style={s.dimLabel}>{dimensionLabel(key)}</Text>
                <Text style={[s.dimValue, { color: dimColor(value) }]}>{value.toFixed(1)}</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%`, backgroundColor: dimColor(value) }]} />
              </View>
            </View>
          );
        })}

        {synthesis && (
          <>
            <View style={s.divider} />
            <Text style={s.eyebrow}>Recruiter assessment</Text>
            <Text style={s.sectionTitle}>What this session signals</Text>
            <Text style={s.body}>{synthesis.recruiter_assessment}</Text>
          </>
        )}

        {speechSummary && (
          <>
            <View style={s.divider} />
            <Text style={s.eyebrow}>Delivery</Text>
            <Text style={s.sectionTitle}>Speech patterns (transcript estimate)</Text>
            <Text style={s.body}>
              Fillers: {speechSummary.total_filler_count} · Rate: {speechSummary.rate_per_minute}/min ·
              Pattern: {speechSummary.severity} · Est. duration:{' '}
              {Math.round(speechSummary.total_duration_seconds / 60)}m
            </Text>
            <Text style={s.muted}>{speechSummary.message}</Text>
          </>
        )}
      </Page>

      {perQuestion.length > 0 && (
        <Page size="A4" style={s.page}>
          <Footer role={role} />
          <Text style={s.eyebrow}>Per-question</Text>
          <Text style={s.sectionTitle}>Answers and scores</Text>
          {perQuestion.map((q) => (
            <View key={q.turnIndex} style={s.qBlock} wrap={false}>
              <Text style={s.qTitle}>
                Q{q.turnIndex + 1} · {q.questionType} · {Number(q.overall).toFixed(1)}/10
              </Text>
              <Text style={s.body}>{q.question}</Text>
              <Text style={s.muted}>Your answer</Text>
              <Text style={s.body}>{q.transcript.slice(0, 800)}</Text>
              {includeModelAnswers && q.modelAnswerLines.length > 0 && (
                <>
                  <Text style={s.muted}>Model answer example</Text>
                  {q.modelAnswerLines.slice(0, 4).map((line, i) => (
                    <Text key={i} style={s.body}>
                      • {line}
                    </Text>
                  ))}
                </>
              )}
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}
