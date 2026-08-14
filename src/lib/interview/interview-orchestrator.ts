/**
 * Dual-agent orchestrator: ties Agent 2 (evaluator), follow-up generation, and
 * conversation-state persistence into a single per-answer pipeline.
 *
 * Uses `interview_id` (migration 020 column / TS field). Mutating helpers in
 * conversation-state trust their inputs — ownership is enforced by the API route.
 */

import { analyzeAnswer } from '@/lib/interview/agent-evaluator';
import { generateFollowUp, buildAcknowledgment } from '@/lib/interview/followup-generator';
import { generateFollowUpStream } from '@/lib/interview/followup-stream';
import {
  updateConversationState,
  getConversationState,
  initializeConversationState,
  persistFollowUpQuestion,
} from '@/lib/interview/conversation-state';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { selectTone } from '@/lib/interview/tone-selector';
import type {
  ConversationState,
  ConversationTurn,
  InterviewContext,
  AnswerAnalysis,
} from '@/lib/interview/types';
import type { InterviewerTone } from '@/lib/voice/tts-client';
import type { InterviewerId } from '@/lib/config/interviewers';
import type { InterviewMode } from '@/lib/interview/interview-mode';

export interface VoiceMetadata {
  tone: InterviewerTone;
  rapportLevel: number;
  shouldUseVoice: boolean;
}

export interface InterviewResponse {
  type: 'followup' | 'next_question' | 'acknowledgment';
  text: string;
  analysis: AnswerAnalysis;
  should_continue: boolean;
  state_updated: boolean;
  voice_metadata?: VoiceMetadata;
}

function fallbackAnalysis(): AnswerAnalysis {
  return {
    confidence_level: 5,
    technical_depth: 5,
    specificity: 5,
    communication_clarity: 5,
    missing_details: [],
    strengths: [],
    red_flags: [],
    recommended_followup_type: 'acknowledge_move_on',
    analysis_metadata: {},
  };
}

export async function processAnswer(
  interviewId: string,
  question: string,
  answer: string,
  context: InterviewContext,
  interviewerId: InterviewerId | null = null,
  mode: InterviewMode = 'mixed',
): Promise<InterviewResponse> {
  try {
    // State init is non-fatal: DB failure must not block the AI analysis path.
    // Lazy init: created on first answer so the credit-deduct /start path stays clean.
    let state: ConversationState | null = null;
    try {
      state = await getConversationState(interviewId);
      if (!state) {
        console.log('[orchestrator] No conversation_state for', interviewId, '— initializing');
        state = await initializeConversationState(interviewId, context);
      }
    } catch (stateErr) {
      console.warn('[orchestrator] Conversation state unavailable (non-fatal):', stateErr);
    }

    const previousAnalyses = state?.answers_received.map((t) => t.analysis) ?? [];
    const analysis = await analyzeAnswer(question, answer, context, previousAnalyses);

    console.log('[orchestrator] Analysis:', {
      depth: analysis.technical_depth,
      specificity: analysis.specificity,
      followup_type: analysis.recommended_followup_type,
      missing: analysis.missing_details,
    });

    const turn: ConversationTurn = {
      question,
      answer,
      analysis,
      timestamp: new Date().toISOString(),
      question_type: state?.needs_followup ? 'followup' : 'initial',
    };

    // State update is non-fatal: if it fails, continue with stale state values.
    let updatedState: ConversationState | null = state;
    let stateUpdated = false;
    if (state) {
      try {
        updatedState = await updateConversationState(state.id, turn);
        stateUpdated = true;
      } catch (updateErr) {
        console.warn('[orchestrator] State update failed (non-fatal):', updateErr);
      }
    }

    const recentAnalyses = updatedState?.answers_received.slice(-3).map((t) => t.analysis) ?? [analysis];
    const rapportLevel = updatedState?.rapport_level ?? 5;
    const tone = selectTone(rapportLevel, recentAnalyses);
    const voiceMetadata: VoiceMetadata = {
      tone,
      rapportLevel,
      shouldUseVoice: true,
    };

    if (updatedState?.needs_followup && updatedState.followup_context) {
      const followUpQuestion = await generateFollowUp(
        question,
        answer,
        analysis,
        context,
        updatedState.dialogue_history,
        interviewerId,
        mode,
      );

      // generateFollowUp returns '' for acknowledge_move_on / no-signal — fall through
      // to acknowledgment rather than emitting an empty interviewer turn.
      if (followUpQuestion.trim()) {
        if (updatedState?.id) {
          void persistFollowUpQuestion({
            conversationStateId: updatedState.id,
            originalQuestion: question,
            originalAnswer: answer,
            followupQuestion: followUpQuestion,
            followupType: analysis.recommended_followup_type,
          });
        }
        trackInterviewEvent('followup_generated', {
          interviewId,
          followupType: analysis.recommended_followup_type,
        });

        return {
          type: 'followup',
          text: followUpQuestion,
          analysis,
          should_continue: true,
          state_updated: stateUpdated,
          voice_metadata: voiceMetadata,
        };
      }
    }

    const acknowledgment = buildAcknowledgment(analysis);

    return {
      type: 'acknowledgment',
      text: acknowledgment,
      analysis,
      should_continue: true,
      state_updated: stateUpdated,
      voice_metadata: voiceMetadata,
    };
  } catch (error) {
    console.error('[orchestrator] Process answer failed:', error);

    return {
      type: 'acknowledgment',
      text: 'I see. Let me ask you another question.',
      analysis: fallbackAnalysis(),
      should_continue: true,
      state_updated: false,
    };
  }
}

export async function processAnswerStream(
  interviewId: string,
  question: string,
  answer: string,
  context: InterviewContext,
  interviewerId: InterviewerId | null = null,
  mode: InterviewMode = 'mixed',
  onSentence?: (sentence: string, index: number) => void,
  signal?: AbortSignal,
): Promise<InterviewResponse> {
  try {
    let state: ConversationState | null = null;
    try {
      state = await getConversationState(interviewId);
      if (!state) {
        state = await initializeConversationState(interviewId, context);
      }
    } catch (stateErr) {
      console.warn('[orchestrator] Conversation state unavailable (non-fatal):', stateErr);
    }

    const previousAnalyses = state?.answers_received.map((t) => t.analysis) ?? [];
    const analysis = await analyzeAnswer(question, answer, context, previousAnalyses);

    const turn: ConversationTurn = {
      question,
      answer,
      analysis,
      timestamp: new Date().toISOString(),
      question_type: state?.needs_followup ? 'followup' : 'initial',
    };

    let updatedState: ConversationState | null = state;
    let stateUpdated = false;
    if (state) {
      try {
        updatedState = await updateConversationState(state.id, turn);
        stateUpdated = true;
      } catch (updateErr) {
        console.warn('[orchestrator] State update failed (non-fatal):', updateErr);
      }
    }

    const recentAnalyses = updatedState?.answers_received.slice(-3).map((t) => t.analysis) ?? [analysis];
    const rapportLevel = updatedState?.rapport_level ?? 5;
    const tone = selectTone(rapportLevel, recentAnalyses);
    const voiceMetadata: VoiceMetadata = {
      tone,
      rapportLevel,
      shouldUseVoice: true,
    };

    if (updatedState?.needs_followup && updatedState.followup_context) {
      const followUpQuestion = await generateFollowUpStream(
        question,
        answer,
        analysis,
        context,
        updatedState.dialogue_history,
        interviewerId,
        mode,
        onSentence,
        signal,
      );

      if (followUpQuestion.trim()) {
        if (updatedState?.id) {
          void persistFollowUpQuestion({
            conversationStateId: updatedState.id,
            originalQuestion: question,
            originalAnswer: answer,
            followupQuestion: followUpQuestion,
            followupType: analysis.recommended_followup_type,
          });
        }
        trackInterviewEvent('followup_generated', {
          interviewId,
          followupType: analysis.recommended_followup_type,
        });

        return {
          type: 'followup',
          text: followUpQuestion,
          analysis,
          should_continue: true,
          state_updated: stateUpdated,
          voice_metadata: voiceMetadata,
        };
      }
    }

    const acknowledgment = buildAcknowledgment(analysis);
    if (onSentence) {
      onSentence(acknowledgment, 0);
    }

    return {
      type: 'acknowledgment',
      text: acknowledgment,
      analysis,
      should_continue: true,
      state_updated: stateUpdated,
      voice_metadata: voiceMetadata,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('[orchestrator] Process answer stream failed:', error);

    const fallbackText = 'I see. Let me ask you another question.';
    if (onSentence) {
      onSentence(fallbackText, 0);
    }

    return {
      type: 'acknowledgment',
      text: fallbackText,
      analysis: fallbackAnalysis(),
      should_continue: true,
      state_updated: false,
    };
  }
}

export async function suggestNextQuestion(
  interviewId: string,
  context: InterviewContext,
  questionBank: string[],
): Promise<string> {
  const state = await getConversationState(interviewId);
  if (!state) {
    return questionBank[0] || 'Tell me about yourself.';
  }

  const askedQuestions = new Set(state.questions_asked.map((q) => q.question));
  const remainingQuestions = questionBank.filter((q) => !askedQuestions.has(q));

  if (remainingQuestions.length === 0) {
    return 'That concludes our interview. Thank you for your time.';
  }

  const difficultyLevel = state.current_difficulty_level;

  const questionIndex = Math.min(
    Math.floor((difficultyLevel / 10) * remainingQuestions.length),
    remainingQuestions.length - 1,
  );

  return remainingQuestions[questionIndex];
}

export function buildInterviewerPrompt(
  context: InterviewContext,
  conversationHistory: string,
  rapportLevel: number,
): string {
  const tone =
    rapportLevel >= 7
      ? 'warm and encouraging'
      : rapportLevel >= 4
        ? 'professional and supportive'
        : 'patient and understanding';

  return `You are an expert interviewer conducting a ${context.interview_style} interview for a ${context.role} position.

INTERVIEW CONTEXT:
- Difficulty: ${context.difficulty}
- Focus areas: ${context.focus_areas.join(', ')}
- Current rapport level: ${rapportLevel}/10
- Your tone: ${tone}

CONVERSATION SO FAR:
${conversationHistory}

INSTRUCTIONS:
- Be conversational and human, not robotic
- Reference their previous answers when relevant
- If they're nervous (rapport < 5), be more encouraging
- If they're confident (rapport > 7), challenge them more
- Use Indian context: understand Hinglish, campus culture, common company names (TCS, Infosys, Wipro)
- Never repeat the same question twice
- Maintain natural flow - no "Question 1:", "Question 2:" formatting

Generate your next response naturally.`;
}
