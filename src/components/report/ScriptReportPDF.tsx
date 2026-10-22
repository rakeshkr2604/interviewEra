import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReportSpeechSummary } from '@/types/app.types';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { dimensionLabel, type PerQuestionReportRow } from '@/lib/interview/script-report/aggregate';
import {
  countCoresInRows,
  countFollowUpsInRows,
  groupPerQuestionByCore,
} from '@/lib/interview/script-report/per-question';
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

/**
 * @react-pdf/renderer cannot reuse web CSS. This PDF mirrors the web report's
 * section order, grouping, and canonical payload. Pixel-perfect parity is not
 * claimed; Chromium print-to-PDF was rejected for Vercel serverless cost/auth.
 */
const BRAND = '#6366f1';
const TEXT = '#111827';
const MUTED = '#6b7280';
const BODY = '#374151';
const BORDER = '#e5e7eb';
const CARD_BG = '#fafafa';
const FU_BG = '#f5f3ff';
const FU_BORDER = '#ddd6fe';

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BODY,
  },
  brand: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 3 },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 2 },
  subtitle: { fontSize: 9, color: MUTED, marginBottom: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 10 },
  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 8 },
  scoreBig: { fontSize: 40, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  body: { fontSize: 10, color: BODY, lineHeight: 1.55, marginBottom: 6 },
  muted: { fontSize: 8, color: MUTED, lineHeight: 1.4, marginBottom: 4 },
  dimRow: { marginBottom: 5 },
  dimLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  dimLabel: { fontSize: 9, color: BODY },
  dimValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  barTrack: { backgroundColor: '#e5e7eb', borderRadius: 4, height: 5 },
  barFill: { borderRadius: 4, height: 5, backgroundColor: BRAND },
  card: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: CARD_BG,
  },
  fuCard: {
    marginBottom: 8,
    marginLeft: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: FU_BORDER,
    borderRadius: 8,
    backgroundColor: FU_BG,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#eef2ff',
    marginRight: 4,
    marginBottom: 2,
  },
  badgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: TEXT, textTransform: 'uppercase' },
  fuBadge: { backgroundColor: '#ede9fe' },
  qTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 6 },
  fieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
    marginTop: 4,
  },
  answerText: { fontSize: 9, color: BODY, lineHeight: 1.5, marginBottom: 4 },
  scoreLine: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  /** Separates answer/model block from dimension notes (matches web card-border). */
  answerEvalDivider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 8,
    paddingTop: 8,
  },
  dimNote: { fontSize: 8, color: BODY, lineHeight: 1.4, marginBottom: 2 },
  signalRow: { marginBottom: 6 },
  signalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT },
  signalDetail: { fontSize: 8, color: BODY, lineHeight: 1.4 },
  roadmapBlock: {
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
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

function QuestionBlock({
  q,
  includeModelAnswers,
  nested,
}: {
  q: PerQuestionReportRow;
  includeModelAnswers: boolean;
  nested?: boolean;
}) {
  const isFollowUp = q.isFollowUp === true;
  const unavailable =
    q.evaluationStatus === 'unavailable' || q.overall == null || q.dimensions == null;
  const coreLabel =
    typeof q.coreSequence === 'number' ? `Q${q.coreSequence}` : `Turn ${q.turnIndex}`;
  const followLabel =
    typeof q.followUpSequence === 'number'
      ? `Follow-up ${q.followUpSequence}`
      : 'Follow-up';

  return (
    <View style={nested || isFollowUp ? s.fuCard : s.card} wrap>
      <View style={s.badgeRow}>
        <View style={[s.badge, isFollowUp ? s.fuBadge : {}]}>
          <Text style={s.badgeText}>{isFollowUp ? followLabel : coreLabel}</Text>
        </View>
        {!isFollowUp && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{q.questionType}</Text>
          </View>
        )}
        {isFollowUp && (
          <View style={[s.badge, s.fuBadge]}>
            <Text style={s.badgeText}>Adaptive follow-up</Text>
          </View>
        )}
      </View>

      {unavailable ? (
        <Text style={[s.scoreLine, { color: MUTED }]}>Evaluation unavailable</Text>
      ) : (
        <Text style={[s.scoreLine, { color: dimColor(Number(q.overall)) }]}>
          {Number(q.overall).toFixed(1)} / 10
          {q.scoreSuspect ? ' · Score flagged for review' : ''}
          {q.answerQualityKind === 'question_echo'
            ? ' · Question repeated — not a substantive answer'
            : ''}
        </Text>
      )}

      <Text style={s.qTitle}>{q.question}</Text>

      {q.oneLineSummary && !unavailable ? (
        <Text style={[s.muted, { fontFamily: 'Helvetica-Oblique' }]}>{q.oneLineSummary}</Text>
      ) : null}

      <Text style={s.fieldLabel}>Your answer</Text>
      <Text style={s.answerText}>{q.transcript || 'No answer recorded.'}</Text>

      {includeModelAnswers ? (
        <>
          <Text style={s.fieldLabel}>Model answer example</Text>
          {q.modelAnswerLines.length > 0 ? (
            q.modelAnswerLines.map((line, i) => (
              <Text key={i} style={s.answerText}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={s.muted}>No example available for this turn.</Text>
          )}
        </>
      ) : null}

      {(!unavailable && q.dimensions) || (q.focusNote && !unavailable) ? (
        <View style={s.answerEvalDivider}>
          {!unavailable && q.dimensions
            ? DIMENSION_KEYS.map((key) => {
                const d = q.dimensions![key];
                if (!d) return null;
                return (
                  <Text key={key} style={s.dimNote}>
                    {dimensionLabel(key)} · {Number(d.score).toFixed(1)}
                    {d.note ? ` — ${d.note}` : ''}
                  </Text>
                );
              })
            : null}

          {q.focusNote && !unavailable ? (
            <>
              <Text style={s.fieldLabel}>Recruiter miss</Text>
              <Text style={s.answerText}>{q.focusNote}</Text>
            </>
          ) : null}
        </View>
      ) : null}
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
  const groups = groupPerQuestionByCore(perQuestion);
  const coreCount = countCoresInRows(perQuestion);
  const followUpCount = countFollowUpsInRows(perQuestion);

  return (
    <Document title={`InterviewEra Report — ${role}`} author="InterviewEra">
      <Page size="A4" style={s.page} wrap>
        <Footer role={role} />
        <Text style={s.brand}>INTERVIEWERA · V2.1 REPORT</Text>
        <Text style={s.title}>Interview report</Text>
        <Text style={s.subtitle}>
          {role} · Completed {completedAt} · {scoredAnswerCount} scored answers
          {coreCount > 0 || followUpCount > 0
            ? ` · ${coreCount} core · ${followUpCount} follow-up${followUpCount === 1 ? '' : 's'}`
            : ''}
        </Text>
        <View style={s.divider} />

        <Text style={s.eyebrow}>Session score</Text>
        <Text style={[s.scoreBig, { color: dimColor(overall) }]}>{overall.toFixed(1)} / 10</Text>
        <Text style={s.body}>
          Band: {scoreBand.replace(/_/g, ' ')} · Signal: {placementSignal.replace(/_/g, ' ')}
        </Text>
        <Text style={s.muted}>
          Session-scoped only — not a percentile vs other candidates, and not a hiring guarantee.
          Session average includes all scored answers (core and follow-up) with equal weight.
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

        {synthesis ? (
          <>
            <View style={s.divider} />
            <Text style={s.eyebrow}>Recruiter assessment</Text>
            <Text style={s.sectionTitle}>What this session signals</Text>
            <Text style={s.body}>{synthesis.recruiter_assessment}</Text>
            {synthesis.hiring_signals?.length ? (
              <>
                <Text style={s.fieldLabel}>Hiring signals</Text>
                {synthesis.hiring_signals.map((sig, i) => (
                  <View key={i} style={s.signalRow} wrap={false}>
                    <Text style={s.signalLabel}>
                      {sig.label} · {sig.polarity}
                    </Text>
                    <Text style={s.signalDetail}>{sig.detail}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {speechSummary ? (
          <>
            <View style={s.divider} />
            <Text style={s.eyebrow}>Delivery</Text>
            <Text style={s.sectionTitle}>Speech patterns (transcript estimate)</Text>
            <Text style={s.body}>
              Fillers: {speechSummary.total_filler_count} · Rate: {speechSummary.rate_per_minute}/min
              · Pattern: {speechSummary.severity} · Est. duration:{' '}
              {Math.round(speechSummary.total_duration_seconds / 60)}m
            </Text>
            <Text style={s.muted}>{speechSummary.message}</Text>
          </>
        ) : null}
      </Page>

      {synthesis ? (
        <Page size="A4" style={s.page} wrap>
          <Footer role={role} />
          <Text style={s.eyebrow}>Detailed synthesis</Text>
          <Text style={s.sectionTitle}>Intelligence narratives</Text>
          <Text style={s.fieldLabel}>Behavioral</Text>
          <Text style={s.body}>{synthesis.behavioral_intelligence}</Text>
          <Text style={s.fieldLabel}>Communication</Text>
          <Text style={s.body}>{synthesis.communication_intelligence}</Text>
          <Text style={s.fieldLabel}>Technical</Text>
          <Text style={s.body}>{synthesis.technical_intelligence}</Text>

          {synthesis.roadmap_30_day?.length ? (
            <>
              <View style={s.divider} />
              <Text style={s.eyebrow}>30-day roadmap</Text>
              <Text style={s.sectionTitle}>Practice plan from your weakest dimensions</Text>
              {synthesis.roadmap_30_day.map((week) => (
                <View key={week.week} style={s.roadmapBlock} wrap={false}>
                  <Text style={s.signalLabel}>
                    Week {week.week}: {week.title}
                  </Text>
                  <Text style={s.muted}>
                    Focus · {dimensionLabel(week.focus_dimension as DimensionKey)}
                  </Text>
                  {week.actions.map((action, i) => (
                    <Text key={i} style={s.answerText}>
                      • {action}
                    </Text>
                  ))}
                </View>
              ))}
            </>
          ) : null}
        </Page>
      ) : null}

      {groups.length > 0 ? (
        <Page size="A4" style={s.page} wrap>
          <Footer role={role} />
          <Text style={s.eyebrow}>Per-question analysis</Text>
          <Text style={s.sectionTitle}>Answers, scores, and model examples</Text>
          <Text style={s.muted}>
            {coreCount} core question{coreCount === 1 ? '' : 's'}
            {followUpCount > 0
              ? ` · ${followUpCount} adaptive follow-up${followUpCount === 1 ? '' : 's'}`
              : ''}
          </Text>
          <View style={s.divider} />
          {groups.map((group) => (
            <View key={`g-${group.core.turnIndex}`}>
              <QuestionBlock q={group.core} includeModelAnswers={includeModelAnswers} />
              {group.followUps.map((fu) => (
                <QuestionBlock
                  key={`fu-${fu.turnIndex}`}
                  q={fu}
                  includeModelAnswers={includeModelAnswers}
                  nested
                />
              ))}
            </View>
          ))}
        </Page>
      ) : null}
    </Document>
  );
}
