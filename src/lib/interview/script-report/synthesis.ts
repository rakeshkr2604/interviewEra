/**
 * One LLM synthesis call for v2.1 script reports: narratives + 30-day roadmap.
 * Scores themselves are never re-computed here — only prose over aggregates.
 */

import { z } from 'zod';
import type { AggregatedScriptReport } from '@/lib/interview/script-report/aggregate';
import { dimensionLabel } from '@/lib/interview/script-report/aggregate';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';

/** v2: explicit nested JSON example in prompt — v1 omitted shapes and models returned strings/objects. */
export const SCRIPT_REPORT_SYNTHESIS_VERSION = 'script-report-synth-v2';

export const scriptReportSynthesisSchema = z.object({
  recruiter_assessment: z.string().min(40).max(1200),
  behavioral_intelligence: z.string().min(40).max(900),
  communication_intelligence: z.string().min(40).max(900),
  technical_intelligence: z.string().min(40).max(900),
  hiring_signals: z
    .array(
      z.object({
        label: z.string().min(2).max(80),
        detail: z.string().min(10).max(280),
        polarity: z.enum(['strength', 'watch', 'gap']),
      }),
    )
    .min(2)
    .max(6),
  roadmap_30_day: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        focus_dimension: z.enum([
          'relevance',
          'content_accuracy',
          'communication_clarity',
          'structure',
          'specificity',
        ]),
        title: z.string().min(4).max(100),
        actions: z.array(z.string().min(8).max(220)).min(1).max(3),
      }),
    )
    .min(3)
    .max(4),
  /** Optional fill-ins when a turn has no coaching restructured_example. */
  model_answer_fillins: z
    .array(
      z.object({
        turn_index: z.number().int(),
        lines: z.array(z.string().min(4).max(280)).min(1).max(6),
      }),
    )
    .max(12)
    .default([]),
});

export type ScriptReportSynthesis = z.infer<typeof scriptReportSynthesisSchema>;

const FOCUS_DIMS = new Set([
  'relevance',
  'content_accuracy',
  'communication_clarity',
  'structure',
  'specificity',
]);

/**
 * Coerce only the known-bad shapes from synth-v1 failures. Does NOT invent
 * narrative scores. Returns which coercions ran so callers can log activation.
 */
export type SynthesisNormalizeResult = {
  value: unknown;
  /** Empty on happy path (already schema-shaped). */
  coercions: string[];
};

export function normalizeScriptReportSynthesisRaw(raw: unknown): SynthesisNormalizeResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { value: raw, coercions: [] };
  }
  const obj = { ...(raw as Record<string, unknown>) };
  const coercions: string[] = [];

  // hiring_signals: string → objects (live failure attempt 1)
  if (typeof obj.hiring_signals === 'string') {
    const detail = obj.hiring_signals.trim();
    obj.hiring_signals = detail
      ? [
          {
            label: 'Session signal',
            detail: detail.slice(0, 280),
            polarity: 'watch',
          },
          {
            label: 'See dimension averages',
            detail: 'Review weakest dimensions in the score breakdown for this session.',
            polarity: 'watch',
          },
        ]
      : [];
    coercions.push('hiring_signals:string→objects');
  } else if (Array.isArray(obj.hiring_signals)) {
    const hadBareString = obj.hiring_signals.some((item) => typeof item === 'string');
    if (hadBareString) {
      // attempt 2: ["strong"] — convert strings only; leave real objects alone
      obj.hiring_signals = obj.hiring_signals
        .map((item, i) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) return item;
          if (typeof item === 'string') {
            const detail =
              item.trim().length >= 10
                ? item.trim()
                : `Session signal: ${item.trim() || 'watch'}.`;
            return {
              label: `Signal ${i + 1}`,
              detail: detail.slice(0, 280),
              polarity: 'watch',
            };
          }
          return null;
        })
        .filter(Boolean);
      coercions.push('hiring_signals:string[]→objects');
      // Do NOT pad to min(2) — if only one tag remains, validation fails → repair/fallback.
    }
  }

  // roadmap_30_day: { week_1: "..." } → array (attempt 1)
  if (obj.roadmap_30_day && typeof obj.roadmap_30_day === 'object' && !Array.isArray(obj.roadmap_30_day)) {
    const map = obj.roadmap_30_day as Record<string, unknown>;
    const entries = Object.entries(map);
    obj.roadmap_30_day = entries.map(([key, value], idx) => {
      const weekMatch = key.match(/(\d+)/);
      const week = weekMatch ? Number(weekMatch[1]) : idx + 1;
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return {
        week: Math.min(4, Math.max(1, week || idx + 1)),
        focus_dimension: 'structure',
        title: `Week ${week}: practice focus`,
        actions: [text.slice(0, 220).padEnd(8, '.')],
      };
    });
    coercions.push('roadmap_30_day:object→array');
  } else if (Array.isArray(obj.roadmap_30_day)) {
    const hadBareString = obj.roadmap_30_day.some((item) => typeof item === 'string');
    let remappedFocus = false;
    obj.roadmap_30_day = obj.roadmap_30_day.map((item, idx) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = { ...(item as Record<string, unknown>) };
        if (typeof row.focus_dimension === 'string' && !FOCUS_DIMS.has(row.focus_dimension)) {
          row.focus_dimension = 'structure';
          remappedFocus = true;
        }
        return row;
      }
      if (typeof item === 'string') {
        return {
          week: idx + 1,
          focus_dimension: 'structure',
          title: `Week ${idx + 1}: practice focus`,
          actions: [item.slice(0, 220).padEnd(8, '.')],
        };
      }
      return item;
    });
    if (hadBareString) coercions.push('roadmap_30_day:string[]→objects');
    if (remappedFocus) coercions.push('roadmap_30_day:focus_dimension→structure');
  }

  // model_answer_fillins: { "1": ["..."] } → array (attempt 1)
  if (
    obj.model_answer_fillins &&
    typeof obj.model_answer_fillins === 'object' &&
    !Array.isArray(obj.model_answer_fillins)
  ) {
    const map = obj.model_answer_fillins as Record<string, unknown>;
    obj.model_answer_fillins = Object.entries(map).map(([key, value]) => ({
      turn_index: Number(key),
      lines: Array.isArray(value)
        ? value.filter((l): l is string => typeof l === 'string')
        : typeof value === 'string'
          ? [value]
          : [],
    }));
    coercions.push('model_answer_fillins:object→array');
  }

  return { value: obj, coercions };
}

export function validateScriptReportSynthesis(
  raw: unknown,
): {
  ok: true;
  value: ScriptReportSynthesis;
  coercions: string[];
} | {
  ok: false;
  errors: string[];
  coercions: string[];
} {
  const { value: normalized, coercions } = normalizeScriptReportSynthesisRaw(raw);
  if (coercions.length > 0) {
    console.warn(
      `[script-report] synthesis normalizer coerced shapes: ${coercions.join(', ')}`,
    );
  }
  const parsed = scriptReportSynthesisSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false,
      coercions,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }
  return { ok: true, value: parsed.data, coercions };
}

const JSON_SHAPE_EXAMPLE = `{
  "recruiter_assessment": "2-6 sentences about THIS session's score pattern. No percentiles.",
  "behavioral_intelligence": "2-4 sentences on behavioral-tagged answers (relevance + structure).",
  "communication_intelligence": "2-4 sentences on communication_clarity patterns.",
  "technical_intelligence": "2-4 sentences on content_accuracy + specificity on technical-tagged turns (or note if none).",
  "hiring_signals": [
    { "label": "Short label", "detail": "One concrete sentence tied to scores/notes.", "polarity": "strength" },
    { "label": "Another label", "detail": "Another concrete sentence.", "polarity": "watch" }
  ],
  "roadmap_30_day": [
    {
      "week": 1,
      "focus_dimension": "structure",
      "title": "Week 1: tighten STAR structure",
      "actions": ["Practice one concrete drill this week.", "Rewrite one weak answer from this session."]
    },
    {
      "week": 2,
      "focus_dimension": "specificity",
      "title": "Week 2: add measurable detail",
      "actions": ["Add numbers/tools to three answers."]
    },
    {
      "week": 3,
      "focus_dimension": "communication_clarity",
      "title": "Week 3: clarify delivery",
      "actions": ["Record and trim filler phrases."]
    },
    {
      "week": 4,
      "focus_dimension": "structure",
      "title": "Week 4: full mock with structure focus",
      "actions": ["Run a timed mock and score structure only."]
    }
  ],
  "model_answer_fillins": [
    { "turn_index": 1, "lines": ["In that situation, ...", "I owned ...", "I personally ...", "As a result, ..."] }
  ]
}`;

export function buildScriptReportSynthesisSystemPrompt(): string {
  return `You write an honest end-of-interview coaching report for Indian campus / early-career candidates.

Hard rules:
- Use ONLY the score-v1.2 dimensions provided: relevance, content_accuracy, communication_clarity, structure, specificity.
- NEVER invent a "Confidence" dimension or score.
- NEVER invent percentiles, population ranks, or "top X%" claims — we have no verified peer dataset.
- NEVER claim a hire decision or job guarantee. Placement language must stay score-band scoped ("on this session").
- Base the 30-day roadmap on the weakest dimensions listed — concrete weekly practice, not generic filler.
- model_answer_fillins: only for turns listed as missing_model_answer; 3–4 full spoken paragraphs matching a complete interview answer (STAR flow for HR, logical flow for technical). No Situation:/Task: headings. Same length as a real spoken answer, not stubs. Use [] if none missing.
- Return ONE JSON object only. No markdown fences.

CRITICAL — exact types (do not invent alternate shapes):
- hiring_signals MUST be an array of objects with keys label, detail, polarity ("strength"|"watch"|"gap"). NEVER a plain string. NEVER an array of bare strings like ["strong"].
- roadmap_30_day MUST be an array of objects with keys week, focus_dimension, title, actions. NEVER a plain object like {"week_1":"..."}. NEVER an array of bare strings.
- focus_dimension MUST be one of: relevance, content_accuracy, communication_clarity, structure, specificity.
- model_answer_fillins MUST be an array of { turn_index, lines }. NEVER an object keyed by turn index.

Example of the ONLY accepted shape:
${JSON_SHAPE_EXAMPLE}`;
}

export function buildScriptReportSynthesisUserPrompt(args: {
  targetRole: string;
  scriptType: string | null;
  aggregate: Extract<AggregatedScriptReport, { kind: 'scored' }>;
  missingModelAnswerTurnIndexes: number[];
}): string {
  const { targetRole, scriptType, aggregate, missingModelAnswerTurnIndexes } = args;

  const dimLines = (
    Object.entries(aggregate.dimensionAverages) as [DimensionKey, number][]
  )
    .map(([k, v]) => `- ${dimensionLabel(k)} (${k}): ${v.toFixed(1)}/10`)
    .join('\n');

  const questionBrief = aggregate.perQuestion
    .slice(0, 12)
    .map((q) => {
      const notes = (
        Object.entries(q.dimensions) as [DimensionKey, { score: number; note?: string }][]
      )
        .map(([k, d]) => `    ${k}=${d.score}${d.note ? ` (${d.note.slice(0, 120)})` : ''}`)
        .join('\n');
      return [
        `Q${q.turnIndex} [${q.questionType}] overall=${q.overall} suspect=${q.scoreSuspect}`,
        `  question: ${q.question.slice(0, 220)}`,
        `  answer excerpt: ${q.transcript.slice(0, 280)}`,
        `  summary: ${q.oneLineSummary ?? '(none)'}`,
        `  dims:\n${notes}`,
        `  has_model_answer: ${q.modelAnswerLines.length > 0}`,
      ].join('\n');
    })
    .join('\n\n');

  return `Target role: ${targetRole || 'Not specified'}
Script type: ${scriptType ?? 'unknown'}
Session overall (weighted): ${aggregate.overall.toFixed(1)}/10
Score band: ${aggregate.scoreBand}
Placement signal key (interpret only — do not invent percentiles): ${aggregate.placementSignal}
Scored answers: ${aggregate.scoredAnswerCount}
Prompt versions used: ${aggregate.promptVersions.join(', ') || 'unknown'}
Weakest dimensions (focus roadmap here): ${aggregate.weakestDimensions.map(dimensionLabel).join(', ')}

Dimension averages:
${dimLines}

Turns needing model_answer_fillins (turn_index list): ${
    missingModelAnswerTurnIndexes.length
      ? missingModelAnswerTurnIndexes.join(', ')
      : '(none — return model_answer_fillins: [])'
  }

Per-question evidence:
${questionBrief || '(no scored answers)'}

Return JSON matching the exact schema in the system prompt (arrays of objects for hiring_signals and roadmap_30_day).`;
}

export function buildScriptReportSynthesisRepairPrompt(errors: string[]): string {
  return `Your previous JSON failed validation. Fix these issues and return corrected JSON only.

Errors:
${errors.map((e) => `- ${e}`).join('\n')}

Reminder — hiring_signals must look like:
[{"label":"...","detail":"...","polarity":"strength"}]
NOT a string and NOT ["strong"].

roadmap_30_day must look like:
[{"week":1,"focus_dimension":"structure","title":"...","actions":["..."]}]
NOT {"week_1":"..."} and NOT ["Week 1: ..."].`;
}

/** Deterministic prose when synthesis LLM fails — report still shows real scores. */
export function buildDeterministicSynthesis(
  aggregate: Extract<AggregatedScriptReport, { kind: 'scored' }>,
): ScriptReportSynthesis {
  const weak = aggregate.weakestDimensions.map(dimensionLabel);
  const overall = aggregate.overall.toFixed(1);
  const limitedNote = aggregate.limitedData
    ? ` Based on only ${aggregate.scoredAnswerCount} scored answer(s) — treat as directional.`
    : '';

  return {
    recruiter_assessment: `Across ${aggregate.scoredAnswerCount} scored answer(s), your weighted session score is ${overall}/10 (${aggregate.scoreBand.replace(/_/g, ' ')}). Strongest progress will come from improving ${weak.slice(0, 2).join(' and ')}. This assessment reflects only this mock session — not a peer percentile or hiring decision.${limitedNote}`,
    behavioral_intelligence:
      'Behavioral signal is inferred from your behavioral-tagged answers: look at Relevance (did you answer the situation asked?) and Structure (clear situation → action → result). Use the per-question notes below to see where stories lost the thread.',
    communication_intelligence:
      'Communication Clarity averages how easy it was to follow your spoken or typed answer. Prefer shorter sentences, one idea per beat, and explicit transitions when you change topics.',
    technical_intelligence:
      'Technical signal comes from Content Accuracy and Specificity on technical-tagged turns — correct concepts plus concrete tools, numbers, or constraints. Vague high-level answers cap these scores even when tone is confident.',
    hiring_signals: [
      {
        label: 'Session score band',
        detail: `Overall ${overall}/10 maps to band "${aggregate.scoreBand}" on this session only.`,
        polarity:
          aggregate.overall >= 6.5 ? 'strength' : aggregate.overall >= 4.5 ? 'watch' : 'gap',
      },
      {
        label: 'Primary development areas',
        detail: weak.length
          ? `Lowest dimensions: ${weak.join(', ')}.`
          : 'Insufficient scored answers to rank dimensions.',
        polarity: 'watch',
      },
    ],
    roadmap_30_day: [1, 2, 3, 4].map((week) => {
      const focus =
        aggregate.weakestDimensions[
          (week - 1) % Math.max(aggregate.weakestDimensions.length, 1)
        ] ?? 'structure';
      return {
        week,
        focus_dimension: focus,
        title: `Week ${week}: strengthen ${dimensionLabel(focus)}`,
        actions: [
          `Record 3 answers focusing only on ${dimensionLabel(focus)}; score yourself against the score-v1.2 note language.`,
          `Rewrite one weak answer from this report until the ${dimensionLabel(focus)} note would change.`,
        ],
      };
    }),
    model_answer_fillins: [],
  };
}
