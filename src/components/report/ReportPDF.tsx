import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ScoreJustification, ReportInsights, ReportSpeechSummary } from '@/types/app.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFQuestionItem {
  orderIndex: number;
  questionText: string;
  category: string;
  answerText: string | null;
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
  speechSummary?: ReportSpeechSummary | null;
  insights?: ReportInsights | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingHorizontal: 44, paddingVertical: 36, fontFamily: 'Helvetica', fontSize: 10 },
  // Header
  brand: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 3 },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#6b7280' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 10 },
  // Section label
  eyebrow: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  // Badge row
  badgeRow: { flexDirection: 'row', marginBottom: 10 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 },
  badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Narrative
  narrative: { fontSize: 10, color: '#374151', lineHeight: 1.6, fontFamily: 'Helvetica-Oblique', marginBottom: 8, paddingHorizontal: 2 },
  // Strongest/weakest row
  dimHighRow: { flexDirection: 'row', marginBottom: 10 },
  dimHighItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  dimHighLabel: { fontSize: 8, color: '#6b7280', marginRight: 4 },
  dimHighValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // Signals grid
  signalsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  signalCard: { width: '33.33%', paddingRight: 4, paddingBottom: 4 },
  signalInner: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signalLabel: { fontSize: 8, color: '#374151' },
  signalBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  signalBadgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'capitalize' },
  // Score
  scoreBig: { fontSize: 48, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  // Dimension bars
  dimRow: { marginBottom: 5 },
  dimLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  dimLabel: { fontSize: 9, color: '#374151' },
  dimValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  barTrack: { backgroundColor: '#e5e7eb', borderRadius: 4, height: 5 },
  barFill: { borderRadius: 4, height: 5 },
  // Score justification
  justifyBox: { marginTop: 10, padding: 10, backgroundColor: '#f5f3ff', borderRadius: 6, borderWidth: 1, borderColor: '#ddd6fe' },
  justifyTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  justifyBody: { fontSize: 9, color: '#374151', lineHeight: 1.5, marginBottom: 6 },
  justifyColTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  // Bullet rows
  bulletRow: { flexDirection: 'row', marginBottom: 3 },
  bullet: { fontSize: 9, color: '#6b7280', marginRight: 4, lineHeight: 1.5 },
  bulletText: { fontSize: 9, color: '#6b7280', flex: 1, lineHeight: 1.5 },
  // Speech box
  speechBox: { marginTop: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  speechTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  speechStatsRow: { flexDirection: 'row', marginBottom: 8 },
  speechStat: { flex: 1, backgroundColor: '#ffffff', borderRadius: 4, padding: 6, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', marginRight: 4 },
  speechStatValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827' },
  speechStatLabel: { fontSize: 7, color: '#6b7280', marginTop: 1 },
  speechStatHint: { fontSize: 6, color: '#9ca3af', marginTop: 1 },
  speechFillersRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  speechFillerLabel: { fontSize: 8, color: '#374151', marginBottom: 4 },
  speechFillerChip: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, marginRight: 3, marginBottom: 3 },
  speechFillerChipText: { fontSize: 7, color: '#92400e' },
  speechMessage: { fontSize: 8, color: '#6b7280', lineHeight: 1.4 },
  // Intelligence page
  intelSection: { marginBottom: 14 },
  intelSectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  intelNarrative: { fontSize: 9, color: '#374151', lineHeight: 1.55, marginBottom: 6 },
  intelItalic: { fontSize: 9, color: '#6b7280', lineHeight: 1.55, fontFamily: 'Helvetica-Oblique', marginBottom: 6 },
  intelCols: { flexDirection: 'row' },
  intelCol: { flex: 1 },
  intelColRight: { flex: 1, marginLeft: 10 },
  intelColTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  benchBox: { backgroundColor: '#eff6ff', borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe', padding: 10, marginTop: 6 },
  benchPercRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  benchPercNum: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginRight: 4 },
  benchPercLabel: { fontSize: 9, color: '#6b7280' },
  benchNarrative: { fontSize: 9, color: '#374151', lineHeight: 1.5, marginBottom: 4 },
  benchCalib: { fontSize: 7, color: '#9ca3af', lineHeight: 1.4 },
  // Q&A cards (compact)
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 5, padding: 10, marginBottom: 8 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  qNum: { fontSize: 8, color: '#9ca3af', fontFamily: 'Helvetica-Bold' },
  categoryBadge: { fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  qText: { fontSize: 9, color: '#111827', marginBottom: 4, lineHeight: 1.45 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scoreSmall: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginRight: 6 },
  feedback: { fontSize: 8, color: '#6b7280', lineHeight: 1.45, flex: 1 },
  analysisRow: { flexDirection: 'row', marginTop: 4 },
  analysisCol: { flex: 1 },
  analysisColRight: { flex: 1, marginLeft: 8 },
  analysisTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  analysisBullet: { fontSize: 8, color: '#6b7280', lineHeight: 1.4 },
  modelBox: { borderLeftWidth: 2, borderLeftColor: '#60a5fa', backgroundColor: '#eff6ff', padding: 7, borderRadius: 3, marginTop: 5 },
  modelLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 2 },
  modelText: { fontSize: 8, color: '#374151', lineHeight: 1.4 },
  // Roadmap page
  roadmapFocusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  roadmapChip: { backgroundColor: '#ede9fe', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 5, marginBottom: 5 },
  roadmapChipText: { fontSize: 8, color: '#6d28d9', fontFamily: 'Helvetica-Bold' },
  roadmapCols: { flexDirection: 'row' },
  roadmapCol: { flex: 1 },
  roadmapColRight: { flex: 1, marginLeft: 12 },
  roadmapColTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  roadmapItem: { marginBottom: 8 },
  roadmapNum: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6366f1', marginBottom: 2 },
  roadmapText: { fontSize: 8, color: '#374151', lineHeight: 1.5 },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#9ca3af' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return '#9ca3af';
  if (score >= 7) return '#16a34a';
  if (score >= 5) return '#ca8a04';
  return '#dc2626';
}

function categoryColors(cat: string): { bg: string; text: string } {
  if (cat === 'technical')  return { bg: '#dbeafe', text: '#1d4ed8' };
  if (cat === 'behavioral') return { bg: '#f3e8ff', text: '#7e22ce' };
  return { bg: '#ffedd5', text: '#c2410c' };
}

function hiringSignalStyle(signal: string): { bg: string; color: string; label: string } {
  if (signal === 'hire')       return { bg: '#d1fae5', color: '#059669', label: 'Hire Signal' };
  if (signal === 'borderline') return { bg: '#fef3c7', color: '#b45309', label: 'Borderline' };
  return                              { bg: '#fee2e2', color: '#dc2626', label: 'Needs Prep' };
}

function readinessStyle(level: string): { bg: string; color: string; label: string } {
  if (level === 'ready')      return { bg: '#dbeafe', color: '#1d4ed8', label: 'Placement Ready' };
  if (level === 'developing') return { bg: '#ede9fe', color: '#7c3aed', label: 'Developing' };
  return                             { bg: '#f3f4f6', color: '#6b7280', label: 'Early Stage' };
}

function signalStrengthStyle(strength: string): { bg: string; color: string } {
  if (strength === 'strong')   return { bg: '#d1fae5', color: '#059669' };
  if (strength === 'moderate') return { bg: '#fef3c7', color: '#b45309' };
  return                              { bg: '#fee2e2', color: '#dc2626' };
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const SIGNAL_LABELS: Record<string, string> = {
  technical_ownership:       'Technical Ownership',
  communication_clarity:     'Communication',
  problem_solving:           'Problem Solving',
  confidence_under_pressure: 'Confidence',
  answer_structure:          'Answer Structure',
  relevance:                 'Relevance',
};

function BarFill({ score }: { score: number | null }) {
  if (score == null) return <View style={s.barTrack} />;
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

// ─── Page 1: Executive Summary ────────────────────────────────────────────────

function CoverPage({
  role,
  difficulty,
  completedAt,
  overallScore,
  dimensionScores,
  scoreJustification,
  speechSummary,
  insights,
}: Omit<ReportPDFProps, 'questions'>) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />

      {/* Header */}
      <Text style={s.brand}>InterviewEra</Text>
      <Text style={s.title}>Interview Report</Text>
      <Text style={[s.subtitle, { marginBottom: 10 }]}>
        {role} · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty · {completedAt}
      </Text>

      <View style={s.divider} />

      {insights ? (
        <>
          {/* Hiring signal + readiness badges */}
          <Text style={s.eyebrow}>Recruiter Assessment</Text>
          <View style={s.badgeRow}>
            {(() => {
              const hs = hiringSignalStyle(insights.executive_summary.hiring_signal);
              return (
                <View style={[s.badge, { backgroundColor: hs.bg }]}>
                  <Text style={[s.badgeText, { color: hs.color }]}>{hs.label}</Text>
                </View>
              );
            })()}
            {(() => {
              const rs = readinessStyle(insights.executive_summary.readiness_level);
              return (
                <View style={[s.badge, { backgroundColor: rs.bg }]}>
                  <Text style={[s.badgeText, { color: rs.color }]}>{rs.label}</Text>
                </View>
              );
            })()}
            <View style={[s.badge, { backgroundColor: '#f3f4f6' }]}>
              <Text style={[s.badgeText, { color: '#374151' }]}>
                Role fit: {insights.executive_summary.role_fit_confidence.toFixed(1)}/10
              </Text>
            </View>
          </View>

          {/* Recruiter narrative */}
          <Text style={s.narrative}>
            &ldquo;{insights.executive_summary.narrative}&rdquo;
          </Text>

          {/* Strongest / Weakest */}
          <View style={s.dimHighRow}>
            <View style={s.dimHighItem}>
              <Text style={s.dimHighLabel}>Strongest:</Text>
              <Text style={[s.dimHighValue, { color: '#059669' }]}>
                {insights.executive_summary.strongest_dimension}
              </Text>
            </View>
            <View style={s.dimHighItem}>
              <Text style={s.dimHighLabel}>Weakest:</Text>
              <Text style={[s.dimHighValue, { color: '#dc2626' }]}>
                {insights.executive_summary.weakest_dimension}
              </Text>
            </View>
          </View>

          {/* Hiring signals grid */}
          <Text style={[s.eyebrow, { marginBottom: 6 }]}>Hiring Signals</Text>
          <View style={s.signalsGrid}>
            {Object.entries(insights.hiring_signals).map(([key, strength]) => {
              const ss = signalStrengthStyle(strength as string);
              return (
                <View key={key} style={s.signalCard}>
                  <View style={s.signalInner}>
                    <Text style={s.signalLabel}>{SIGNAL_LABELS[key] ?? key}</Text>
                    <View style={[s.signalBadge, { backgroundColor: ss.bg }]}>
                      <Text style={[s.signalBadgeText, { color: ss.color }]}>{strength as string}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={s.divider} />
        </>
      ) : null}

      {/* Overall score */}
      <Text style={[s.sectionTitle, { marginTop: insights ? 0 : 4 }]}>Overall Score</Text>
      <Text style={[s.scoreBig, { color: scoreColor(overallScore) }]}>
        {overallScore.toFixed(1)}
      </Text>
      <Text style={[s.scoreLabel, { marginBottom: 12 }]}>out of 10.0</Text>

      {/* Score justification (non-insights path or supplement) */}
      {!insights && scoreJustification ? (
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

      {/* Dimension breakdown */}
      <Text style={s.sectionTitle}>Dimension Breakdown</Text>
      {dimensionScores.map(({ label, score }) => (
        <View key={label} style={s.dimRow}>
          <View style={s.dimLabelRow}>
            <Text style={s.dimLabel}>{label}</Text>
            <Text style={[s.dimValue, { color: scoreColor(score) }]}>
              {score == null ? '—' : score.toFixed(1)} / 10
            </Text>
          </View>
          <BarFill score={score} />
        </View>
      ))}

      {/* Speech patterns */}
      {speechSummary ? (
        <View style={s.speechBox} wrap={false}>
          <Text style={s.speechTitle}>Speech Patterns</Text>
          <View style={s.speechStatsRow}>
            {[
              { value: String(speechSummary.total_filler_count), label: 'Filler Words', hint: `${speechSummary.percentage}% of words` },
              { value: String(speechSummary.rate_per_minute), label: 'Rate / min', hint: 'Benchmark: <3' },
              { value: speechSummary.severity.charAt(0).toUpperCase() + speechSummary.severity.slice(1), label: 'Pattern', hint: 'Safe / Warning / Severe' },
              { value: formatDuration(speechSummary.total_duration_seconds), label: 'Duration', hint: 'Total speaking time' },
            ].map((stat) => (
              <View key={stat.label} style={s.speechStat}>
                <Text style={s.speechStatValue}>{stat.value}</Text>
                <Text style={s.speechStatLabel}>{stat.label}</Text>
                <Text style={s.speechStatHint}>{stat.hint}</Text>
              </View>
            ))}
          </View>
          {speechSummary.top_fillers.length > 0 && (
            <View style={{ marginBottom: 4 }}>
              <Text style={s.speechFillerLabel}>Top fillers:</Text>
              <View style={s.speechFillersRow}>
                {speechSummary.top_fillers.slice(0, 5).map(({ word, occurrences }) => (
                  <View key={word} style={s.speechFillerChip}>
                    <Text style={s.speechFillerChipText}>{word} ×{occurrences}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text style={s.speechMessage}>
            {speechSummary.message}
            {speechSummary.source !== 'stored' ? ' · Duration partially estimated for some answers.' : ''}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}

// ─── Page 2: Intelligence Report (Pro, requires insights) ─────────────────────

function IntelligencePage({ insights, role }: { insights: ReportInsights; role: string }) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />

      <Text style={s.brand}>InterviewEra</Text>
      <Text style={[s.title, { marginBottom: 10 }]}>AI Hiring Intelligence</Text>
      <View style={s.divider} />

      {/* Behavioral Patterns */}
      {insights.behavioral_patterns.length > 0 && (
        <View style={s.intelSection}>
          <Text style={s.intelSectionTitle}>Behavioral Patterns</Text>
          {insights.behavioral_patterns.map((pattern, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={[s.bullet, { color: '#6366f1' }]}>◆</Text>
              <Text style={s.bulletText}>{pattern}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Communication Intelligence */}
      <View style={s.intelSection}>
        <Text style={s.intelSectionTitle}>Communication Intelligence</Text>
        <Text style={s.intelNarrative}>{insights.communication.clarity_narrative}</Text>
        <Text style={s.intelItalic}>{insights.communication.confidence_progression}</Text>
        <View style={s.intelCols}>
          {insights.communication.strengths.length > 0 && (
            <View style={s.intelCol}>
              <Text style={[s.intelColTitle, { color: '#059669' }]}>Strengths</Text>
              {insights.communication.strengths.map((str, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: '#059669' }]}>•</Text>
                  <Text style={s.bulletText}>{str}</Text>
                </View>
              ))}
            </View>
          )}
          {insights.communication.weaknesses.length > 0 && (
            <View style={s.intelColRight}>
              <Text style={[s.intelColTitle, { color: '#dc2626' }]}>To Improve</Text>
              {insights.communication.weaknesses.map((w, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: '#dc2626' }]}>•</Text>
                  <Text style={s.bulletText}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Technical Intelligence */}
      <View style={s.intelSection}>
        <Text style={s.intelSectionTitle}>Technical Intelligence</Text>
        <Text style={s.intelNarrative}>{insights.technical.depth_assessment}</Text>
        <View style={s.intelCols}>
          {insights.technical.strength_patterns.length > 0 && (
            <View style={s.intelCol}>
              <Text style={[s.intelColTitle, { color: '#059669' }]}>Strengths</Text>
              {insights.technical.strength_patterns.map((str, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: '#059669' }]}>•</Text>
                  <Text style={s.bulletText}>{str}</Text>
                </View>
              ))}
            </View>
          )}
          {insights.technical.weak_patterns.length > 0 && (
            <View style={s.intelColRight}>
              <Text style={[s.intelColTitle, { color: '#dc2626' }]}>Gaps</Text>
              {insights.technical.weak_patterns.map((w, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={[s.bullet, { color: '#dc2626' }]}>•</Text>
                  <Text style={s.bulletText}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Benchmarking */}
      <View style={s.benchBox} wrap={false}>
        <Text style={[s.intelSectionTitle, { marginBottom: 6 }]}>Benchmarking</Text>
        <View style={s.benchPercRow}>
          <Text style={s.benchPercNum}>{insights.benchmarking.percentile_estimate}th</Text>
          <Text style={s.benchPercLabel}>percentile</Text>
        </View>
        <Text style={s.benchNarrative}>{insights.benchmarking.comparison_narrative}</Text>
        <Text style={s.benchCalib}>{insights.benchmarking.role_calibration}</Text>
      </View>
    </Page>
  );
}

// ─── Page 3: Per-Question Analysis ────────────────────────────────────────────

function PerQuestionPage({ questions, role }: { questions: PDFQuestionItem[]; role: string }) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />
      <Text style={s.brand}>InterviewEra</Text>
      <Text style={[s.title, { marginBottom: 10 }]}>Per-Question Analysis</Text>
      <View style={s.divider} />

      {questions.map((q) => {
        const catColors = categoryColors(q.category);
        const topStrength = q.strengths[0] ?? null;
        const topImprovement = q.improvements[0] ?? null;
        return (
          <View key={q.orderIndex} style={s.card} wrap={false}>
            <View style={s.qHeader}>
              <Text style={s.qNum}>Q{q.orderIndex + 1}</Text>
              <Text style={[s.categoryBadge, { backgroundColor: catColors.bg, color: catColors.text }]}>
                {q.category}
              </Text>
            </View>
            <Text style={s.qText}>{q.questionText}</Text>

            {q.overallScore !== null && (
              <View style={s.scoreRow}>
                <Text style={[s.scoreSmall, { color: scoreColor(q.overallScore) }]}>
                  {q.overallScore.toFixed(1)}/10
                </Text>
                {q.feedbackText && (
                  <Text style={s.feedback}>{q.feedbackText}</Text>
                )}
              </View>
            )}

            {(topStrength || topImprovement) && (
              <View style={s.analysisRow}>
                {topStrength && (
                  <View style={s.analysisCol}>
                    <Text style={[s.analysisTitle, { color: '#059669' }]}>Strength</Text>
                    <Text style={s.analysisBullet}>{topStrength}</Text>
                  </View>
                )}
                {topImprovement && (
                  <View style={s.analysisColRight}>
                    <Text style={[s.analysisTitle, { color: '#dc2626' }]}>To Improve</Text>
                    <Text style={s.analysisBullet}>{topImprovement}</Text>
                  </View>
                )}
              </View>
            )}

            {q.modelAnswerHint && (
              <View style={s.modelBox}>
                <Text style={s.modelLabel}>Model Answer</Text>
                <Text style={s.modelText}>{q.modelAnswerHint}</Text>
              </View>
            )}
          </View>
        );
      })}
    </Page>
  );
}

// ─── Page 4: Improvement Roadmap (Pro, requires insights) ────────────────────

function RoadmapPage({ insights, role }: { insights: ReportInsights; role: string }) {
  return (
    <Page size="A4" style={s.page}>
      <PageFooter role={role} />

      <Text style={s.brand}>InterviewEra</Text>
      <Text style={[s.title, { marginBottom: 10 }]}>30-Day Improvement Roadmap</Text>
      <View style={s.divider} />

      {/* Focus areas */}
      <Text style={s.eyebrow}>Focus Areas</Text>
      <View style={s.roadmapFocusRow}>
        {insights.improvement_roadmap.focus_areas.map((area) => (
          <View key={area} style={s.roadmapChip}>
            <Text style={s.roadmapChipText}>{area}</Text>
          </View>
        ))}
      </View>

      <View style={s.divider} />

      {/* Week 1 + Month 1 columns */}
      <View style={s.roadmapCols}>
        <View style={s.roadmapCol}>
          <Text style={s.roadmapColTitle}>This Week</Text>
          {insights.improvement_roadmap.week_1.map((action, i) => (
            <View key={i} style={s.roadmapItem}>
              <Text style={s.roadmapNum}>{i + 1}.</Text>
              <Text style={s.roadmapText}>{action}</Text>
            </View>
          ))}
        </View>
        <View style={s.roadmapColRight}>
          <Text style={s.roadmapColTitle}>30-Day Plan</Text>
          {insights.improvement_roadmap.month_1.map((action, i) => (
            <View key={i} style={s.roadmapItem}>
              <Text style={s.roadmapNum}>{i + 1}.</Text>
              <Text style={s.roadmapText}>{action}</Text>
            </View>
          ))}
        </View>
      </View>
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
  speechSummary = null,
  insights = null,
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
        speechSummary={speechSummary}
        insights={insights}
      />
      {insights ? <IntelligencePage insights={insights} role={role} /> : null}
      <PerQuestionPage questions={questions} role={role} />
      {insights ? <RoadmapPage insights={insights} role={role} /> : null}
    </Document>
  );
}
