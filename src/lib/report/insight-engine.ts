/**
 * Deterministic insight engine — synthesizes AI evaluation data into
 * recruiter-grade intelligence. Zero extra AI API calls; all insights
 * derive from per-answer evaluation data already stored in the DB.
 */

import type {
  DimensionScores,
  ReportSpeechSummary,
  ReportInsights,
  SignalStrength,
  HiringSignal,
  ReadinessLevel,
} from '@/types/app.types';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';

// Re-export for callers that only import from insight-engine
export type { ReportInsights, SignalStrength, HiringSignal, ReadinessLevel };

// ─── Input ────────────────────────────────────────────────────────────────────

export interface PerQuestionInsightData {
  category: string;
  score: number;
  feedbackText: string;
  strengths: string[];
  improvements: string[];
  dimensionScores: DimensionScores | null;
}

export interface InsightInput {
  overallScore: number;
  dimensionAverages: DimensionScores;
  perQuestions: PerQuestionInsightData[];
  speechSummary: ReportSpeechSummary | null;
  role: string;
  difficulty: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signalFromScore(score: number): SignalStrength {
  if (score >= 7) return 'strong';
  if (score >= 5) return 'moderate';
  return 'weak';
}

function hiringSignalFromScore(score: number): HiringSignal {
  if (score >= 7.5) return 'hire';
  if (score >= 5.5) return 'borderline';
  return 'reject';
}

function readinessFromScore(score: number): ReadinessLevel {
  if (score >= 7) return 'ready';
  if (score >= 5) return 'developing';
  return 'early_stage';
}

function roleFitConfidence(score: number, dims: DimensionScores): number {
  const vals = Object.values(dims);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const variancePenalty = Math.min(variance * 0.12, 1.5);
  return Math.max(1, Math.min(10, Math.round((score - variancePenalty) * 10) / 10));
}

// ─── Recruiter narrative ───────────────────────────────────────────────────────

function buildRecruiterNarrative(dims: DimensionScores, overall: number): string {
  const { communication_clarity, technical_depth, answer_structure, confidence, relevance } = dims;

  const isHighTech = technical_depth >= 7;
  const isLowTech  = technical_depth < 5;
  const isHighComm = communication_clarity >= 7;
  const isLowComm  = communication_clarity < 5;
  const isLowStruct = answer_structure < 5;
  const isHighStruct = answer_structure >= 7;
  const isLowConf  = confidence < 5;
  const isHighConf = confidence >= 7;
  const isLowRel   = relevance < 5;

  if (overall >= 7.5) {
    return `Demonstrates well-rounded interview readiness — technical depth, structured communication, and confident delivery are all above threshold. A strong candidate for placement consideration.`;
  }

  if (isHighTech && isLowStruct && isLowComm) {
    return `Strong implementation intuition and technical knowledge, but struggles to articulate ideas in a structured, recruiter-friendly format. The gap is in communication architecture, not domain competence.`;
  }

  if (isHighTech && isLowComm) {
    return `Domain knowledge is evident but communication gaps reduce its impact. Interviewers may perceive depth as lower than it is because ideas aren't being conveyed clearly.`;
  }

  if (isHighTech && isLowStruct) {
    return `Solid technical grounding with clear practical intuition, but answers lack structured delivery. A clear opening, supporting evidence, and defined conclusion per answer would significantly raise perceived quality.`;
  }

  if (isHighComm && isLowTech) {
    return `Articulate and confident in delivery — communicates well under pressure. Technical preparation is the primary gap before placement readiness in engineering-track roles.`;
  }

  if (isHighStruct && isLowTech) {
    return `Well-organized responses and clear delivery, but technical substance needs deeper development. A strong communicator who would benefit from focused subject-matter preparation.`;
  }

  if (isHighConf && isLowTech) {
    return `Confident and assertive delivery creates a strong first impression, but technical answers don't match the confidence level — a gap that surfaces under follow-up pressure.`;
  }

  if (isLowConf && isHighTech) {
    return `Technical knowledge is present and substantive, but visible hesitation and hedging language reduces its impact. Confidence-building practice would unlock significantly higher scores.`;
  }

  if (isLowConf && isLowComm) {
    return `Communication and confidence are the primary barriers at this stage. Technical preparation appears foundational but both delivery dimensions need significant work for placement readiness.`;
  }

  if (isLowRel) {
    return `Answers frequently drift from the core question — a pattern that creates concern for interviewers regardless of underlying knowledge. Active listening and structured response framing are high-priority improvements.`;
  }

  if (overall >= 6.5) {
    const highDims = (Object.entries(dims) as [keyof DimensionScores, number][])
      .filter(([, v]) => v >= 7)
      .map(([k]) => REPORT_DIMENSION_LABELS[k].toLowerCase())
      .slice(0, 2);
    const lowDims = (Object.entries(dims) as [keyof DimensionScores, number][])
      .filter(([, v]) => v < 5.5)
      .map(([k]) => REPORT_DIMENSION_LABELS[k].toLowerCase())
      .slice(0, 1);
    if (highDims.length > 0 && lowDims.length > 0) {
      return `Demonstrates strength in ${highDims.join(' and ')}, with targeted gaps in ${lowDims.join(' and ')}. Focused preparation in weak areas would push this candidate above placement threshold.`;
    }
    return `Solid overall performance with clear strengths and room to improve in 1–2 specific areas. The foundations are in place for strong interview performance with targeted preparation.`;
  }

  if (overall >= 5) {
    return `Developing candidate with a mixed profile — some answers show genuine potential while others reveal preparation gaps. Consistent structured practice across all dimensions is the clear next step.`;
  }

  return `Significant preparation is needed across most dimensions before placement readiness. Prioritizing structured practice, technical depth, and mock interview feedback will build the required foundation.`;
}

// ─── Behavioral patterns ───────────────────────────────────────────────────────

function detectBehavioralPatterns(perQs: PerQuestionInsightData[]): string[] {
  if (perQs.length === 0) return [];
  const patterns: string[] = [];

  const allImps  = perQs.flatMap((q) => q.improvements.map((s) => s.toLowerCase()));
  const allFeedback = perQs.map((q) => q.feedbackText.toLowerCase()).join(' ');
  const allStrengths = perQs.flatMap((q) => q.strengths.map((s) => s.toLowerCase()));

  // Lacks concrete examples / metrics
  const exampleHits = allImps.filter((s) =>
    /specific|example|concrete|metric|quantif|measur/.test(s),
  ).length;
  if (exampleHits >= 2) {
    patterns.push(
      'Answers consistently describe concepts without grounding them in specific, measurable examples from actual work or projects.',
    );
  }

  // Structure problems
  const structureHits = allImps.filter((s) =>
    /structure|organiz|flow|logical|begin|introduction|opening/.test(s),
  ).length;
  if (structureHits >= 2) {
    patterns.push(
      'Response organization is inconsistent — answers often begin mid-thought without first framing the context or approach.',
    );
  }

  // Surface-level technical answers
  const depthHits = allImps.filter((s) =>
    /depth|deeper|detail|thorough|elaborat|expand/.test(s),
  ).length;
  if (depthHits >= 2) {
    patterns.push(
      'Technical explanations tend to remain at the conceptual level — rarely reaching the implementation specificity that distinguishes strong engineering candidates.',
    );
  }

  // Tradeoff avoidance
  const tradeoffHits = [allImps.join(' '), allFeedback].join(' ')
    .split(/tradeoff|trade.off|alternative|drawback|limitation|downside/).length - 1;
  if (tradeoffHits >= 2) {
    patterns.push(
      'Technical decisions are presented as absolute rather than context-driven — tradeoff reasoning is largely absent, which reduces architectural credibility.',
    );
  }

  // Score variance
  const scores = perQs.map((q) => q.score);
  if (scores.length >= 3) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    if (variance > 2.5) {
      const maxQ = perQs.reduce((a, b) => (a.score > b.score ? a : b));
      const minQ = perQs.reduce((a, b) => (a.score < b.score ? a : b));
      if (maxQ.category !== minQ.category) {
        patterns.push(
          `Performance varies significantly across question types — ${maxQ.category} questions produce stronger responses while ${minQ.category} questions reveal clear gaps.`,
        );
      }
    }
  }

  // Category gap
  const techScores = perQs.filter((q) => q.category === 'technical').map((q) => q.score);
  const behvScores = perQs.filter((q) => q.category === 'behavioral').map((q) => q.score);
  if (techScores.length >= 2 && behvScores.length >= 2) {
    const techAvg = techScores.reduce((a, b) => a + b, 0) / techScores.length;
    const behvAvg = behvScores.reduce((a, b) => a + b, 0) / behvScores.length;
    if (Math.abs(techAvg - behvAvg) >= 1.5) {
      if (techAvg > behvAvg) {
        patterns.push(
          `Technical questions score ${(techAvg - behvAvg).toFixed(1)} points higher than behavioral — strong domain knowledge but weaker impact framing and storytelling in behavioral responses.`,
        );
      } else {
        patterns.push(
          `Behavioral questions score ${(behvAvg - techAvg).toFixed(1)} points higher than technical — strong interpersonal framing, but technical preparation needs focused work.`,
        );
      }
    }
  }

  // Impact-oriented strength
  const impactStrengths = allStrengths.filter((s) =>
    /impact|result|outcome|achiev|deliver/.test(s),
  ).length;
  if (impactStrengths >= 2) {
    patterns.push(
      'Answers consistently link actions to outcomes — an impact-first mindset that resonates well with placement recruiters.',
    );
  }

  return patterns.slice(0, 5);
}

// ─── Communication analysis ────────────────────────────────────────────────────

interface CommAnalysis {
  strengths: string[];
  weaknesses: string[];
  clarity_narrative: string;
  confidence_progression: string;
}

function buildCommunicationAnalysis(
  dims: DimensionScores,
  speech: ReportSpeechSummary | null,
  perQs: PerQuestionInsightData[],
): CommAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (dims.communication_clarity >= 7) {
    strengths.push('Uses clear, professional language that makes complex ideas accessible to interviewers');
  } else if (dims.communication_clarity < 5) {
    weaknesses.push('Communication clarity frequently breaks down — interviewers must infer meaning rather than receive it directly');
  }

  if (dims.confidence >= 7) {
    strengths.push('Confident, assertive delivery builds recruiter trust and projects competence');
  } else if (dims.confidence < 5) {
    weaknesses.push('Hedging language ("I think maybe", "sort of", "I\'m not sure") reduces perceived competence');
  }

  if (dims.answer_structure >= 7) {
    strengths.push('Responses follow a clear arc — context, reasoning, and conclusion are all present');
  } else if (dims.answer_structure < 5) {
    weaknesses.push('Answers lack internal structure — begin mid-thought without framing or a clear takeaway');
  }

  if (speech) {
    if (speech.rate_per_minute >= 6) {
      weaknesses.push(
        `Filler word rate of ${speech.rate_per_minute}/min (benchmark: <3) signals nervous speech patterns that reduce perceived fluency`,
      );
    } else if (speech.rate_per_minute < 3) {
      strengths.push('Clean speech delivery with minimal filler words — projects confidence and preparation');
    }
  }

  // Confidence progression
  let progressionNarrative: string;
  const scores = perQs.map((q) => q.score);
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const firstAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    if (firstAvg - secondAvg >= 1) {
      progressionNarrative =
        'Stronger performance early in the interview, with quality drop-off in later questions — suggests fatigue or growing pressure reduces answer depth.';
    } else if (secondAvg - firstAvg >= 1) {
      progressionNarrative =
        'Performance improves across the interview — later questions show stronger responses, indicating a warm-up curve and building confidence.';
    } else {
      progressionNarrative =
        'Consistent performance maintained across all questions — no significant confidence or quality shift between early and late responses.';
    }
  } else {
    progressionNarrative = 'Consistent delivery maintained across the session.';
  }

  const clarityNarrative =
    dims.communication_clarity >= 7
      ? 'Communication is a standout strength — ideas are framed clearly and interviewers can follow the reasoning without effort.'
      : dims.communication_clarity >= 5
        ? 'Communication quality is adequate but inconsistent. Some answers are clearly framed; others lose structure mid-response.'
        : 'Communication is the primary bottleneck — even when underlying knowledge is present, unclear delivery prevents it from landing with impact.';

  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    clarity_narrative: clarityNarrative,
    confidence_progression: progressionNarrative,
  };
}

// ─── Technical assessment ──────────────────────────────────────────────────────

interface TechAssessment {
  depth_assessment: string;
  weak_patterns: string[];
  strength_patterns: string[];
}

function buildTechnicalAssessment(
  dims: DimensionScores,
  perQs: PerQuestionInsightData[],
  role: string,
): TechAssessment {
  const techQs = perQs.filter((q) => q.category === 'technical');
  const techImps = techQs.flatMap((q) => q.improvements.map((s) => s.toLowerCase()));
  const techStrs = techQs.flatMap((q) => q.strengths.map((s) => s.toLowerCase()));

  const weakPatterns: string[] = [];
  const strengthPatterns: string[] = [];

  if (/buzzword|jargon|vague|generic/.test(techImps.join(' '))) {
    weakPatterns.push('Answers rely on industry buzzwords without demonstrating the underlying implementation understanding');
  }
  if (/tradeoff|trade.off|alternative|drawback/.test(techImps.join(' '))) {
    weakPatterns.push('Technical decisions are presented as absolute — tradeoff reasoning and alternative consideration are absent');
  }
  if (/scale|performance|optim|throughput/.test(techImps.join(' '))) {
    weakPatterns.push('Scalability and performance considerations are rarely raised without direct prompting');
  }
  if (dims.technical_depth < 5) {
    weakPatterns.push('Technical responses remain at definition level — lacks the implementation depth expected in engineering placement interviews');
  }

  if (/implement|practical|real|project|built|deployed/.test(techStrs.join(' '))) {
    strengthPatterns.push('Grounds technical answers in practical implementation experience from projects');
  }
  if (/debug|troubleshoot|systematic|diagnos/.test(techStrs.join(' '))) {
    strengthPatterns.push('Strong debugging mindset — approaches problems systematically with clear diagnostic steps');
  }
  if (dims.technical_depth >= 7) {
    strengthPatterns.push(
      `Domain knowledge for ${role} is clearly above threshold — answers demonstrate real understanding beyond textbook definitions`,
    );
  }
  if (dims.answer_structure >= 7 && dims.technical_depth >= 6) {
    strengthPatterns.push('Communicates technical ideas with both clarity and depth — a rare combination that stands out in placements');
  }

  let depthAssessment: string;
  if (dims.technical_depth >= 7.5) {
    depthAssessment = `Technical depth for ${role} is a clear standout. Answers demonstrate implementation-level understanding, not just conceptual awareness.`;
  } else if (dims.technical_depth >= 6) {
    depthAssessment = `Reasonable technical depth with occasional surface-level responses. Closer engagement with implementation specifics and tradeoffs would push scores into the top quartile.`;
  } else if (dims.technical_depth >= 4.5) {
    depthAssessment = `Technical responses frequently stay at the conceptual level. For ${role} placements, interviewers expect implementation specifics, tradeoff reasoning, and real examples.`;
  } else {
    depthAssessment = `Technical depth is the critical gap for ${role} placement. Foundational concepts need deeper development — practice explaining topics at the implementation level, not the definition level.`;
  }

  return {
    depth_assessment: depthAssessment,
    weak_patterns: weakPatterns.slice(0, 3),
    strength_patterns: strengthPatterns.slice(0, 3),
  };
}

// ─── Benchmarking ──────────────────────────────────────────────────────────────

// Approximation of the normal CDF — Abramowitz & Stegun formula 26.2.17
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x >= 0 ? 1 - p : p;
}

interface BenchmarkResult {
  percentile_estimate: number;
  comparison_narrative: string;
  role_calibration: string;
}

function buildBenchmarking(overall: number, difficulty: string, role: string): BenchmarkResult {
  // Estimated score distributions for Indian campus placement mock interviews
  const dists: Record<string, { mean: number; sd: number }> = {
    easy:   { mean: 5.9, sd: 1.4 },
    medium: { mean: 5.5, sd: 1.5 },
    hard:   { mean: 5.1, sd: 1.5 },
  };
  const dist = dists[difficulty.toLowerCase()] ?? dists['medium'];
  const z = (overall - dist.mean) / dist.sd;
  const pct = Math.max(1, Math.min(99, Math.round(normalCDF(z) * 100)));

  let comparisonNarrative: string;
  if (pct >= 75) {
    comparisonNarrative = `Your score places you in the top quartile of candidates preparing for ${role} interviews at this difficulty. This is placement-competitive performance.`;
  } else if (pct >= 50) {
    comparisonNarrative = `Your score is above the midpoint for ${role} interview preparation at ${difficulty} difficulty. Improving your weakest 1–2 dimensions would push you into the top quartile.`;
  } else if (pct >= 25) {
    comparisonNarrative = `Your score falls in the lower half of benchmark candidates. Consistent structured practice can close this gap within 2–4 weeks of focused preparation.`;
  } else {
    comparisonNarrative = `This is an early-stage result relative to placement-ready candidates. Focus on foundational depth before targeting role-specific complexity.`;
  }

  return {
    percentile_estimate: pct,
    comparison_narrative: comparisonNarrative,
    role_calibration: `Percentile estimated against mock interview data for ${difficulty} difficulty ${role} interviews. Reflects preparation benchmark, not actual placement outcomes.`,
  };
}

// ─── Improvement roadmap ───────────────────────────────────────────────────────

interface RoadmapResult {
  week_1: string[];
  month_1: string[];
  focus_areas: string[];
}

function buildImprovementRoadmap(dims: DimensionScores, role: string): RoadmapResult {
  const sorted = (Object.entries(dims) as [keyof DimensionScores, number][]).sort(
    (a, b) => a[1] - b[1],
  );
  const [dim1, dim2] = sorted.slice(0, 2);

  const week1Plans: Record<keyof DimensionScores, string> = {
    communication_clarity:
      'Record yourself answering 3 mock questions daily. Review each recording for clarity, sentence completion, and absence of filler words.',
    technical_depth: `Pick 5 core ${role} topics. Write a 150-word technical explanation for each: concept → implementation → tradeoff. No generic definitions.`,
    answer_structure:
      'Practice STAR daily — write 2 structured behavioral responses each morning. Time limit: 90 seconds per answer.',
    confidence:
      'Eliminate hedging phrases ("I think", "maybe", "sort of") from all mock answers. Replace with direct assertions backed by evidence.',
    relevance:
      'Before answering each mock question, write in one sentence what the interviewer is actually asking. Answer only that — nothing tangential.',
  };

  const month1Plans: Record<keyof DimensionScores, string> = {
    communication_clarity:
      'Complete 15 timed mock interviews with a focus on communication scoring. Track your filler word rate weekly and target <3/minute.',
    technical_depth: `Build a ${role}-specific depth plan: 3 topics per week at implementation level. Practice explaining each at concept, code, and edge-case levels.`,
    answer_structure:
      'Write STAR responses for 20 placement bank questions. Review each for clear opening context, specific action, and measurable outcome.',
    confidence:
      'Complete 10 mock sessions where you deliberately lead with your conclusion first, then support it. Remove all hedging from your vocabulary.',
    relevance:
      'After 10 mock sessions, review transcripts and highlight any response segments that didn\'t directly address the question. Reduce these to zero.',
  };

  const week1: string[] = [];
  const month1: string[] = [];
  const focusAreas: string[] = [];

  if (dim1) {
    week1.push(week1Plans[dim1[0]]);
    month1.push(month1Plans[dim1[0]]);
    focusAreas.push(REPORT_DIMENSION_LABELS[dim1[0]]);
  }
  if (dim2) {
    week1.push(week1Plans[dim2[0]]);
    month1.push(month1Plans[dim2[0]]);
    focusAreas.push(REPORT_DIMENSION_LABELS[dim2[0]]);
  }

  week1.push(`Complete 2 full-length mock interviews for ${role} this week. Treat each as a real placement session with no pauses.`);
  month1.push('Track your dimension scores across 10 mock sessions. If any score stalls for 3 consecutive sessions, switch strategy — not just effort.');
  focusAreas.push('Mock Interview Practice');

  return { week_1: week1, month_1: month1, focus_areas: focusAreas };
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function generateInsights(input: InsightInput): ReportInsights {
  const { overallScore, dimensionAverages, perQuestions, speechSummary, role, difficulty } = input;

  const dimEntries = Object.entries(dimensionAverages) as [keyof DimensionScores, number][];
  const strongestKey = dimEntries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  const weakestKey   = dimEntries.reduce((a, b) => (a[1] < b[1] ? a : b))[0];

  return {
    executive_summary: {
      narrative:           buildRecruiterNarrative(dimensionAverages, overallScore),
      hiring_signal:       hiringSignalFromScore(overallScore),
      readiness_level:     readinessFromScore(overallScore),
      role_fit_confidence: roleFitConfidence(overallScore, dimensionAverages),
      strongest_dimension: REPORT_DIMENSION_LABELS[strongestKey],
      weakest_dimension:   REPORT_DIMENSION_LABELS[weakestKey],
    },
    hiring_signals: {
      technical_ownership:       signalFromScore(dimensionAverages.technical_depth),
      communication_clarity:     signalFromScore(dimensionAverages.communication_clarity),
      problem_solving:           signalFromScore((dimensionAverages.technical_depth + dimensionAverages.answer_structure) / 2),
      confidence_under_pressure: signalFromScore(dimensionAverages.confidence),
      answer_structure:          signalFromScore(dimensionAverages.answer_structure),
      relevance:                 signalFromScore(dimensionAverages.relevance),
    },
    behavioral_patterns: detectBehavioralPatterns(perQuestions),
    communication:       buildCommunicationAnalysis(dimensionAverages, speechSummary, perQuestions),
    technical:           buildTechnicalAssessment(dimensionAverages, perQuestions, role),
    benchmarking:        buildBenchmarking(overallScore, difficulty, role),
    improvement_roadmap: buildImprovementRoadmap(dimensionAverages, role),
  };
}
