/**
 * Conversation-state persistence for the dual-agent interview loop.
 *
 * Writes use the service client: migration 020 grants `authenticated` SELECT only,
 * so all INSERT/UPDATE must go through service role (CLAUDE.md SUPABASE CLIENT PATTERNS).
 * Callers MUST verify interview ownership before invoking the mutating functions here —
 * the API route does this; these helpers trust their inputs (internal code).
 *
 * Column mapping: the DB column is `interview_id` (migration 020). The TS type and the
 * DB column agree, so no aliasing is needed.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  ConversationState,
  ConversationTurn,
  DialogueEntry,
  InterviewContext,
} from '@/lib/interview/types';
import {
  adjustDifficultyLevel,
  calculateRapportLevel,
  shouldGenerateFollowUp,
} from '@/lib/interview/conversation-helpers';

function startingDifficulty(difficulty: InterviewContext['difficulty']): number {
  if (difficulty === 'beginner') return 3;
  if (difficulty === 'intermediate') return 5;
  return 7;
}

/**
 * Cheap, deterministic read of the candidate's emotional state from Agent 2's
 * analysis — no extra AI call. Drives tone modulation + lets the follow-up
 * generator react ("you seem unsure — let's slow down").
 */
function inferEmotionalState(
  analysis: ConversationTurn['analysis'],
): NonNullable<DialogueEntry['metadata']>['emotional_state'] {
  const defensive = analysis.red_flags.some(
    (f) => f === 'defensive' || f === 'no_ownership' || f === 'passive_voice',
  );
  if (defensive) return 'defensive';
  if (analysis.confidence_level >= 7) return 'confident';
  if (analysis.confidence_level <= 4) return 'uncertain';
  return 'neutral';
}

export async function initializeConversationState(
  interviewId: string,
  context: InterviewContext,
): Promise<ConversationState> {
  const supabase = createServiceClient();

  const state: ConversationState = {
    id: crypto.randomUUID(),
    interview_id: interviewId,
    questions_asked: [],
    answers_received: [],
    dialogue_history: [],
    current_difficulty_level: startingDifficulty(context.difficulty),
    confidence_trend: [],
    topics_covered: [],
    topics_to_probe: [],
    rapport_level: 5,
    current_question_index: 0,
    needs_followup: false,
  };

  const { error } = await supabase.from('conversation_states').insert({
    id: state.id,
    interview_id: state.interview_id,
    questions_asked: state.questions_asked,
    answers_received: state.answers_received,
    dialogue_history: state.dialogue_history,
    current_difficulty_level: state.current_difficulty_level,
    confidence_trend: state.confidence_trend,
    topics_covered: state.topics_covered,
    topics_to_probe: state.topics_to_probe,
    rapport_level: state.rapport_level,
    current_question_index: state.current_question_index,
    needs_followup: state.needs_followup,
  });

  if (error) {
    // 23505 = unique_violation: a concurrent first-answer submit already created
    // the row. That's the expected outcome of the idempotency guard — return the
    // existing state instead of failing the whole orchestrator pass.
    if (error.code === '23505') {
      const existing = await getConversationState(interviewId);
      if (existing) {
        console.log('[conversation-state] Init race resolved — using existing row');
        return existing;
      }
    }
    console.error('[conversation-state] Failed to initialize:', error);
    throw error;
  }

  return state;
}

export async function updateConversationState(
  stateId: string,
  turn: ConversationTurn,
): Promise<ConversationState> {
  const supabase = createServiceClient();

  const { data: currentState, error: fetchError } = await supabase
    .from('conversation_states')
    .select('*')
    .eq('id', stateId)
    .single();

  if (fetchError || !currentState) {
    throw new Error('Conversation state not found');
  }

  const prev = currentState as ConversationState;
  // Older rows (pre-migration 021) may not have the column populated.
  const prevDialogue: DialogueEntry[] = Array.isArray(prev.dialogue_history)
    ? prev.dialogue_history
    : [];

  const newDialogue: DialogueEntry[] = [
    ...prevDialogue,
    {
      speaker: 'interviewer',
      text: turn.question,
      timestamp: turn.timestamp,
    },
    {
      speaker: 'candidate',
      text: turn.answer,
      timestamp: turn.timestamp,
      metadata: {
        score: turn.analysis.technical_depth,
        emotional_state: inferEmotionalState(turn.analysis),
      },
    },
  ];

  const updatedState: ConversationState = {
    ...prev,
    questions_asked: [
      ...prev.questions_asked,
      {
        question: turn.question,
        timestamp: turn.timestamp,
        type: turn.question_type,
      },
    ],
    answers_received: [...prev.answers_received, turn],
    dialogue_history: newDialogue,
    confidence_trend: [...prev.confidence_trend, turn.analysis.confidence_level],
    current_question_index: prev.current_question_index + 1,
  };

  const recentAnalyses = updatedState.answers_received.slice(-3).map((t) => t.analysis);
  updatedState.current_difficulty_level = adjustDifficultyLevel(
    prev.current_difficulty_level,
    recentAnalyses,
  );

  const positiveAcknowledgments = updatedState.answers_received.filter(
    (t) => t.analysis.technical_depth >= 7,
  ).length;
  updatedState.rapport_level = calculateRapportLevel(
    updatedState.confidence_trend,
    positiveAcknowledgments,
  );

  updatedState.needs_followup = shouldGenerateFollowUp(turn.analysis);

  if (updatedState.needs_followup) {
    updatedState.followup_context = {
      type: turn.analysis.recommended_followup_type,
      missing_details: turn.analysis.missing_details,
      original_answer: turn.answer,
    };
  } else {
    updatedState.followup_context = undefined;
  }

  const { error: updateError } = await supabase
    .from('conversation_states')
    .update({
      questions_asked: updatedState.questions_asked,
      answers_received: updatedState.answers_received,
      dialogue_history: updatedState.dialogue_history,
      current_difficulty_level: updatedState.current_difficulty_level,
      confidence_trend: updatedState.confidence_trend,
      topics_covered: updatedState.topics_covered,
      topics_to_probe: updatedState.topics_to_probe,
      rapport_level: updatedState.rapport_level,
      current_question_index: updatedState.current_question_index,
      needs_followup: updatedState.needs_followup,
      followup_context: updatedState.followup_context ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stateId);

  if (updateError) {
    console.error('[conversation-state] Failed to update:', updateError);
    throw updateError;
  }

  const { error: analysisError } = await supabase.from('answer_analyses').insert({
    conversation_state_id: stateId,
    question_text: turn.question,
    answer_text: turn.answer,
    confidence_level: turn.analysis.confidence_level,
    technical_depth: turn.analysis.technical_depth,
    specificity: turn.analysis.specificity,
    communication_clarity: turn.analysis.communication_clarity,
    missing_details: turn.analysis.missing_details,
    strengths: turn.analysis.strengths,
    red_flags: turn.analysis.red_flags,
    recommended_followup_type: turn.analysis.recommended_followup_type,
    analysis_metadata: turn.analysis.analysis_metadata ?? {},
  });

  if (analysisError) {
    // Non-fatal: analytics row is best-effort, the state update already succeeded.
    console.error('[conversation-state] Failed to persist answer_analyses:', analysisError);
  }

  return updatedState;
}

/** Persist generated follow-up for learning/improvement (migration 020). Best-effort. */
export async function persistFollowUpQuestion(input: {
  conversationStateId: string;
  originalQuestion: string;
  originalAnswer: string;
  followupQuestion: string;
  followupType: string;
}): Promise<void> {
  const supabase = createServiceClient();

  const { data: analysis } = await supabase
    .from('answer_analyses')
    .select('id')
    .eq('conversation_state_id', input.conversationStateId)
    .eq('question_text', input.originalQuestion)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysis?.id) {
    console.warn('[conversation-state] followup_questions skip — no analysis row');
    return;
  }

  const { error } = await supabase.from('followup_questions').insert({
    answer_analysis_id: analysis.id,
    original_question: input.originalQuestion,
    original_answer: input.originalAnswer,
    followup_question: input.followupQuestion,
    followup_type: input.followupType,
    was_used: true,
  });

  if (error) {
    console.error('[conversation-state] Failed to persist followup_questions:', error);
  }
}

export async function getConversationState(
  interviewId: string,
): Promise<ConversationState | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('conversation_states')
    .select('*')
    .eq('interview_id', interviewId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ConversationState;
}

export async function getConversationHistory(stateId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('conversation_states')
    .select('answers_received')
    .eq('id', stateId)
    .maybeSingle();

  if (error || !data) {
    return '';
  }

  const turns = (data.answers_received ?? []) as ConversationTurn[];

  return turns
    .map(
      (turn, idx) =>
        `[Turn ${idx + 1}]
Interviewer: ${turn.question}
Candidate: ${turn.answer}
(Analysis: Depth=${turn.analysis.technical_depth}/10, Clarity=${turn.analysis.communication_clarity}/10)`,
    )
    .join('\n\n');
}
