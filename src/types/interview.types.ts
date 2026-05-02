export interface InterviewSession {
  id: string
  role: string
  mode: 'Technical' | 'HR'
  interviewerId: 'priya' | 'arjun'
  questions: InterviewQuestion[]
  currentQuestionIndex: number
  status: 'briefing' | 'active' | 'completed'
  skipCount: number
  maxSkips: number
}

export interface InterviewQuestion {
  id: string
  order: number
  question_text: string
  category: 'technical' | 'behavioral' | 'situational'
  rubric: {
    ideal_keywords: string[]
    ideal_structure: string
    red_flags: string[]
  }
  timeLimit: number
}

export interface AnswerRecord {
  questionId: string
  transcript: string
  durationSeconds: number
  fillerAnalysis: {
    count: number
    ratePerMinute: number
    severity: 'safe' | 'warning' | 'severe'
    words: { word: string; occurrences: number }[]
  }
  submittedAt: string
}
