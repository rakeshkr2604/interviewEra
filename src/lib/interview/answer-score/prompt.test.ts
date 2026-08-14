import { describe, expect, it } from 'vitest';
import { getOperationSpec } from '@/lib/ai/operation-registry';
import {
  buildAnswerScoreSystemPrompt,
  buildAnswerScoreUserPrompt,
} from './prompt';
import {
  BEH_MISSING_RESULT,
  OPTIONAL_TECHNICAL_EXTRAS,
  Q1_STACK_HEAP,
  Q2_DEADLINE_PARAPHRASE,
  Q2_DEADLINE_SEMANTIC_STAR,
  Q3_NO_DISAGREEMENT_PIVOT,
  Q4_REST_GRAPHQL,
  transcriptHasLiteralStarLabels,
} from './semantic-structure.fixtures';
import { subRubricForQuestionType } from './rubric';

describe('score-v1.6 semantic structure contract', () => {
  it('stays within the answer_score input budget', () => {
    const system = buildAnswerScoreSystemPrompt('behavioral');
    const user = buildAnswerScoreUserPrompt({
      question: Q2_DEADLINE_SEMANTIC_STAR.question,
      questionType: 'behavioral',
      targetRole: 'Full Stack Developer',
      transcript: Q2_DEADLINE_SEMANTIC_STAR.transcript,
    });
    expect(system.length).toBeLessThan(3_500);
    expect(system.length + user.length).toBeLessThanOrEqual(
      getOperationSpec('answer_score').context.maxInputChars,
    );
  });

  it('forbids lexical STAR/label matching and the old "0=no incident" collapse', () => {
    const star = buildAnswerScoreSystemPrompt('behavioral');
    expect(star).toMatch(/SEMANTIC presence/i);
    expect(star).toMatch(/Literal words Situation\/Task\/Action\/Result are NOT required/);
    expect(star).toMatch(/NEVER score 0 because the requested competency\/incident is missing/i);
    expect(star).not.toMatch(/0=no incident/);
    expect(star).toMatch(/do NOT zero structure/i);

    const flow = buildAnswerScoreSystemPrompt('technical');
    expect(flow).toMatch(/Labels are NOT required/i);
    expect(flow).toMatch(/textbook extras are OPTIONAL/i);
  });

  it('separates required question concepts from optional extras', () => {
    const system = buildAnswerScoreSystemPrompt('technical');
    expect(system).toMatch(/derive REQUIRED concepts/i);
    expect(system).toMatch(/OPTIONAL/);
    expect(system).toMatch(/HTTP verbs, primitive types/i);
    expect(system).toMatch(/never "you failed to mention \[optional detail\]"/i);
    for (const extra of OPTIONAL_TECHNICAL_EXTRAS) {
      expect(system.toLowerCase()).not.toContain(`must mention ${extra.toLowerCase()}`);
    }
  });

  it('instructs STT-aware intended-meaning scoring without rewriting the answer', () => {
    const system = buildAnswerScoreSystemPrompt('technical');
    expect(system).toMatch(/exjudation/i);
    expect(system).toMatch(/I had choose/i);
    expect(system).toMatch(/Do not rewrite the answer/);
  });

  it('routes the four manual-review questions to the expected sub-rubric', () => {
    expect(subRubricForQuestionType(Q1_STACK_HEAP.questionType)).toBe('logical_flow');
    expect(subRubricForQuestionType(Q2_DEADLINE_SEMANTIC_STAR.questionType)).toBe('star');
    expect(subRubricForQuestionType(Q3_NO_DISAGREEMENT_PIVOT.questionType)).toBe('star');
    expect(subRubricForQuestionType(Q4_REST_GRAPHQL.questionType)).toBe('logical_flow');
  });

  it('Q2 variants express STAR without literal STAR labels', () => {
    expect(transcriptHasLiteralStarLabels(Q2_DEADLINE_SEMANTIC_STAR.transcript)).toBe(
      false,
    );
    expect(transcriptHasLiteralStarLabels(Q2_DEADLINE_PARAPHRASE.transcript)).toBe(false);
    expect(transcriptHasLiteralStarLabels(BEH_MISSING_RESULT.transcript)).toBe(false);
  });

  it('Q2 paraphrase is a different formation of the same semantic content', () => {
    expect(Q2_DEADLINE_PARAPHRASE.question).toBe(Q2_DEADLINE_SEMANTIC_STAR.question);
    expect(Q2_DEADLINE_PARAPHRASE.transcript).not.toBe(
      Q2_DEADLINE_SEMANTIC_STAR.transcript,
    );
    expect(Q2_DEADLINE_PARAPHRASE.expectDim?.structure?.min).toBe(
      Q2_DEADLINE_SEMANTIC_STAR.expectDim?.structure?.min,
    );
  });

  it('Q3 keeps structure credit independent of low relevance', () => {
    const relMax = Q3_NO_DISAGREEMENT_PIVOT.expectDim?.relevance?.max;
    const structMin = Q3_NO_DISAGREEMENT_PIVOT.expectDim?.structure?.min;
    expect(relMax).toBeLessThan(5);
    expect(structMin).toBeGreaterThanOrEqual(5);
  });

  it('Q1/Q4 do not treat optional extras as required coverage', () => {
    expect(Q1_STACK_HEAP.transcript.toLowerCase()).not.toContain('primitive');
    expect(Q4_REST_GRAPHQL.transcript).not.toMatch(/\bGET\b/);
    expect(Q4_REST_GRAPHQL.transcript).not.toMatch(/\bPOST\b/);
    expect(Q1_STACK_HEAP.expectDim?.specificity?.min).toBeGreaterThanOrEqual(4);
    expect(Q4_REST_GRAPHQL.expectDim?.specificity?.min).toBeGreaterThanOrEqual(4);
  });

  it('embeds the transcript as data, not instructions', () => {
    const user = buildAnswerScoreUserPrompt({
      question: Q1_STACK_HEAP.question,
      questionType: Q1_STACK_HEAP.questionType,
      targetRole: 'Full Stack Developer',
      transcript: Q1_STACK_HEAP.transcript,
    });
    expect(user).toContain('<candidate_transcript>');
    expect(user).toContain(Q1_STACK_HEAP.transcript);
    expect(user).toMatch(/DATA to evaluate/);
  });
});
