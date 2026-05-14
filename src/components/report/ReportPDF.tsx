import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ScoreJustification } from '@/types/app.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFQuestionItem {
  orderIndex: number;
  questionText: string;
  category: string;
  overallScore: number | null;
  feedbackText: string | null;
  strengths: string[];
  improvements: string[];
  modelAnswerHint: string | null;
}

export interface ReportPDFProps {
  role: string;
  difficulty: string;
  completedAt: string;
  overallScore: number;
  dimensionScores: Array<{ label: string; score: number | null }>;
  questions: PDFQuestionItem[];
  scoreJustification?: ScoreJustification | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingHorizontal: 48, paddingVertical: 40, fontFamily: 'Helvetica', fontSize: 10 },
  // Header
  header: { marginBottom: 24 },
  brand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 4 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#6b7280' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 12 },
  // Score box
  scoreBig: { fontSize: 52, fontFamily: 'Helvetica-Bold', color: '#6366f1', lineHeight: 1 },
  scoreLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  // Section heading
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  // Dimension bars
  dimRow: { marginBottom: 6 },
  dimLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  dimLabel: { fontSize: 9, color: '#374151' },
  dimValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  barTrack: { backgroundColor: '#e5e7eb', borderRadius: 4, height: 6 },
  barFill: { borderRadius: 4, height: 6 },
  // Q&A cards
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 12, marginBottom: 10 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  qNum: { fontSize: 9, color: '#9ca3af', fontFamily: 'Helvetica-Bold' },
  categoryBadge: { fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qText: { fontSize: 10, color: '#111827', marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scoreSmall: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginRight: 4 },
  feedback: { fontSize: 9, color: '#6b7280', lineHeight: 1.5 },
  // Analysis
  analysisBlock: { marginBottom: 6 },
  analysisTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 3 },
  bulletRow: { flexDirection: 'row', marginBottom: 2 },
  bullet: { fontSize: 9, color: '#6b7280', marginRight: 4 },
  bulletText: { fontSize: 9, color: '#6b7280', flex: 1, lineHeight: 1.5 },
  // Model answer
  modelBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  modelLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 2 },
  modelText: { fontSize: 9, color: '#374151', lineHeight: 1.5 },
  // Score justification (overall)
  justifyBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f5f3ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  justifyTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  justifyBody: { fontSize: 9, color: '#374151', lineHeight: 1.5, marginBottom: 8 },
  justifyColTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 3,
    marginTop: 4,
  },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return '#9ca3af';
  if (score >= 7) return '#16a34a';
  if (score >= 5) return '#ca8a04';
  return '#dc2626';
}

function categoryColors(cat: string): { bg: string; text: string } {
  if (cat === 'technical') return { bg: '#dbeafe', text: '#1d4ed8' };
  if (cat === 'behavioral') return { bg: '#f3e8ff', text: '#7e22ce' };
  return { bg: '#ffedd5', text: '#c2410c' };
}

function BarFill({ score }: { score: number | null }) {
  if (score == null) {
    return <View style={s.barTrack} />;
  }
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${score * 10}%`, backgroundColor: scoreColor(score) }]} />
    </View>
  );
}

function PageFooter({ role }: { role: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>InterviewEra — {role}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function CoverPage({
  role,
  difficulty,
  completedAt,
  overallScore,
  dimensionScores,
  scoreJustification,
}: Omit<ReportPDFProps, 'questions'>) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>InterviewEra</Text>
        <Text style={s.title}>Interview Report</Text>
        <Text style={s.subtitle}>
          {role} · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty · {completedAt}
        </Text>
      </View>

      <View style={s.divider} />

      {/* Overall score */}
      <View style={{ marginBottom: 16 }}>
        <Text style={s.sectionTitle}>Overall Score</Text>
        <Text style={[s.scoreBig, { color: scoreColor(overallScore) }]}>
          {overallScore.toFixed(1)}
        </Text>
        <Text style={s.scoreLabel}>out of 10.0</Text>
      </View>

      {scoreJustification ? (
        <View style={s.justifyBox} wrap={false}>
          <Text style={s.justifyTitle}>Why this score?</Text>
          <Text style={s.justifyBody}>{scoreJustification.why_this_score}</Text>
          <Text style={s.justifyColTitle}>Key strengths</Text>
          {(scoreJustification.key_strengths ?? []).map((line, idx) => (
            <View key={`s-${idx}`} style={s.bulletRow}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>{line}</Text>
            </View>
          ))}
          <Text style={s.justifyColTitle}>Areas to improve</Text>
          {(scoreJustification.improvement_areas ?? []).map((line, idx) => (
            <View key={`i-${idx}`} style={s.bulletRow}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={s.divider} />

      {/* Dimension breakdown */}
      <View>
        <Text style={s.sectionTitle}>Dimension Breakdown</Text>
        {dimensionScores.map(({ label, score }) => (
          <View key={label} style={s.dimRow}>
            <View style={s.dimLabelRow}>
              <Text style={s.dimLabel}>{label}</Text>
              <Text style={[s.dimValue, { color: scoreColor(score) }]}>
                {score == null ? '—' : `${score.toFixed(1)}`} / 10
              </Text>
            </View>
            <BarFill score={score} />
          </View>
        ))}
      </View>
    </Page>
  );
}

function QuestionsPage({ questions, role }: { questions: PDFQuestionItem[]; role: string }) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />
      <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Per-Question Scores</Text>
      {questions.map((q) => {
        const catColors = categoryColors(q.category);
        return (
          <View key={q.orderIndex} style={s.card} wrap={false}>
            <View style={s.qHeader}>
              <Text style={s.qNum}>Q{q.orderIndex + 1}</Text>
              <Text
                style={[
                  s.categoryBadge,
                  { backgroundColor: catColors.bg, color: catColors.text },
                ]}
              >
                {q.category}
              </Text>
            </View>
            <Text style={s.qText}>{q.questionText}</Text>
            {q.overallScore !== null && (
              <View style={s.scoreRow}>
                <Text style={[s.scoreSmall, { color: scoreColor(q.overallScore) }]}>
                  {q.overallScore.toFixed(1)}/10
                </Text>
                {q.feedbackText && <Text style={s.feedback}>{q.feedbackText}</Text>}
              </View>
            )}
          </View>
        );
      })}
    </Page>
  );
}

function AnalysisPage({ questions, role }: { questions: PDFQuestionItem[]; role: string }) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />
      <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Detailed Analysis</Text>
      {questions.map((q) => (
        <View key={q.orderIndex} style={s.card} wrap={false}>
          <Text style={[s.qNum, { marginBottom: 4 }]}>Q{q.orderIndex + 1} — {q.questionText}</Text>

          {q.strengths.length > 0 && (
            <View style={s.analysisBlock}>
              <Text style={s.analysisTitle}>Strengths</Text>
              {q.strengths.map((str, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.bulletText}>{str}</Text>
                </View>
              ))}
            </View>
          )}

          {q.improvements.length > 0 && (
            <View style={s.analysisBlock}>
              <Text style={s.analysisTitle}>Areas for Improvement</Text>
              {q.improvements.map((imp, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.bulletText}>{imp}</Text>
                </View>
              ))}
            </View>
          )}

          {q.modelAnswerHint && (
            <View style={s.modelBox}>
              <Text style={s.modelLabel}>Model Answer</Text>
              <Text style={s.modelText}>{q.modelAnswerHint}</Text>
            </View>
          )}
        </View>
      ))}
    </Page>
  );
}

// ─── Document root ────────────────────────────────────────────────────────────

export function ReportPDF({
  role,
  difficulty,
  completedAt,
  overallScore,
  dimensionScores,
  questions,
  scoreJustification = null,
}: ReportPDFProps) {
  return (
    <Document
      title={`InterviewEra Report — ${role}`}
      author="InterviewEra"
      subject="Mock Interview Report"
    >
      <CoverPage
        role={role}
        difficulty={difficulty}
        completedAt={completedAt}
        overallScore={overallScore}
        dimensionScores={dimensionScores}
        scoreJustification={scoreJustification}
      />
      <QuestionsPage questions={questions} role={role} />
      <AnalysisPage questions={questions} role={role} />
    </Document>
  );
}
