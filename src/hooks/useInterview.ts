'use client';

import { useState } from 'react';
import type { Interview, Question } from '@/types/app.types';

interface UseInterviewReturn {
  interview: Interview | null;
  questions: Question[];
  currentQuestionIndex: number;
  isLoading: boolean;
  error: string | null;
  advanceToNextQuestion: () => void;
}

export function useInterview(_interviewId: string): UseInterviewReturn {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  void setInterview;
  void setQuestions;
  void setIsLoading;
  void setError;

  function advanceToNextQuestion() {
    setCurrentQuestionIndex((prev) => prev + 1);
  }

  return {
    interview,
    questions,
    currentQuestionIndex,
    isLoading,
    error,
    advanceToNextQuestion,
  };
}
