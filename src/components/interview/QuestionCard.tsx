'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Question } from '@/types/app.types';

const CATEGORY_STYLES: Record<Question['category'], string> = {
  technical: 'bg-blue-100 text-blue-700',
  behavioral: 'bg-purple-100 text-purple-700',
  situational: 'bg-orange-100 text-orange-700',
};

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount. No need to reset to false here — the parent resets
  // the component entirely via key={question.id}, so visible always starts false.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <Card
      className={`transition-opacity duration-300 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <CardContent className="pt-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Q{questionNumber} of {totalQuestions}
          </span>
          <Badge
            className={`text-xs font-medium capitalize border-0 ${
              CATEGORY_STYLES[question.category]
            }`}
          >
            {question.category}
          </Badge>
        </div>
        <p className="text-lg font-medium leading-relaxed">{question.question_text}</p>
      </CardContent>
    </Card>
  );
}
