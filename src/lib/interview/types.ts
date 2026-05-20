export type FollowUpType =
  | 'probe_depth' // Ask for more specific details
  | 'clarify' // Clarify vague statements
  | 'challenge' // Push back, test thinking
  | 'acknowledge_move_on'; // Good answer, next question

export type QuestionType = 'initial' | 'followup' | 'probing';

export interface AnswerAnalysis {
  confidence_level: number; // 1-10
  technical_depth: number; // 1-10
  specificity: number; // 1-10
  communication_clarity: number; // 1-10
  missing_details: string[]; // ["metrics", "timeline", "impact"]
  strengths: string[]; // ["mentioned team collaboration"]
  red_flags: string[]; // ["passive voice", "no ownership"]
  recommended_followup_type: FollowUpType;
  analysis_metadata?: {
    filler_word_count?: number;
    response_time_seconds?: number;
    uses_star_method?: boolean;
    quantifiable_results?: boolean;
  };
}

export interface ConversationTurn {
  question: string;
  answer: string;
  analysis: AnswerAnalysis;
  timestamp: string;
  question_type: QuestionType;
}

export type SpeakerRole = 'interviewer' | 'candidate';

export type EmotionalState = 'confident' | 'uncertain' | 'defensive' | 'neutral';

export interface DialogueEntry {
  speaker: SpeakerRole;
  text: string;
  timestamp: string;
  metadata?: {
    question_id?: string;
    score?: number;
    emotional_state?: EmotionalState;
  };
}

export interface ConversationState {
  id: string;
  interview_id: string;
  questions_asked: Array<{
    question: string;
    timestamp: string;
    type: QuestionType;
  }>;
  answers_received: ConversationTurn[];
  /** Full chronological transcript — both speakers — for context-aware probing. */
  dialogue_history: DialogueEntry[];
  current_difficulty_level: number;
  confidence_trend: number[];
  topics_covered: string[];
  topics_to_probe: string[];
  rapport_level: number;
  current_question_index: number;
  needs_followup: boolean;
  followup_context?: {
    type: FollowUpType;
    missing_details: string[];
    original_answer: string;
  };
}

export interface InterviewContext {
  role: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus_areas: string[];
  interview_style: 'technical' | 'behavioral' | 'mixed';
}
