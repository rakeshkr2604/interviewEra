export type { ScriptType } from '@/lib/ai/scripts/script-loader'
export type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator'
export type { RuntimeContextParams } from '@/lib/ai/scripts/runtime-context'

// v2.1 interview row shape (only columns used by the script engine).
export type ScriptInterviewSession = {
  id: string
  user_id: string
  resume_id: string
  role: string
  difficulty: 'easy' | 'medium' | 'hard'
  question_count: number
  status: 'pending' | 'in_progress' | 'completed' | 'abandoned'
  interviewer_id: 'priya' | 'arjun'
  session_context: {
    goal: string
    interviewMode: string
    experienceYears: number
    interviewerId: string
    jobDescription?: string
  }
  engine: string
  script_type: 'SCRIPT_H' | 'SCRIPT_T' | 'SCRIPT_M'
  current_turn_index: number
  self_intro_enabled: boolean
  last_question_type: 'technical' | 'behavioral' | null
  skips_used: number
  max_skips: number
  multilingual_detected: boolean
  is_returning_user: boolean
  performance_bucket: 'strong' | 'average' | 'low' | null
}
