'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface AnswerInputProps {
  onSubmit: (answerText: string) => Promise<void>;
  isSubmitting: boolean;
  minChars?: number;
}

export function AnswerInput({ onSubmit, isSubmitting, minChars = 50 }: AnswerInputProps) {
  const [value, setValue] = useState('');

  const charCount = value.length;
  const isTooShort = charCount < minChars;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isTooShort || isSubmitting) return;
    await onSubmit(value.trim());
    // Parent advances to next question via key change — no manual clear needed
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Think about specific examples from your experience..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        disabled={isSubmitting}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            charCount === 0
              ? 'text-muted-foreground'
              : isTooShort
                ? 'text-yellow-600'
                : 'text-green-600'
          }`}
        >
          {charCount} chars
          {isTooShort && charCount > 0 ? ` (${minChars - charCount} more recommended)` : ''}
        </span>
        <Button type="submit" disabled={isTooShort || isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Submitting...
            </span>
          ) : (
            'Submit Answer →'
          )}
        </Button>
      </div>
    </form>
  );
}
