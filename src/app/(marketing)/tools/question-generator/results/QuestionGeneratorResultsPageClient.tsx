'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { QuestionGeneratorResultsView } from '../QuestionGeneratorResultsView';
import {
  QUESTIONS_RESULT_STORAGE_KEY,
  parseStoredQuestions,
  type StoredQuestionResult,
} from '../question-generator-result-storage';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

export function QuestionGeneratorResultsPageClient() {
  const router = useRouter();
  const [result, setResult] = useState<StoredQuestionResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    queueMicrotask(() => {
      const raw = sessionStorage.getItem(QUESTIONS_RESULT_STORAGE_KEY);
      if (!raw) {
        setStatus('missing');
        router.replace('/tools/question-generator');
        return;
      }

      const parsed = parseStoredQuestions(raw);
      if (!parsed) {
        sessionStorage.removeItem(QUESTIONS_RESULT_STORAGE_KEY);
        setStatus('missing');
        router.replace('/tools/question-generator');
        return;
      }

      setResult(parsed);
      setStatus('ready');
    });
  }, [router]);

  if (status === 'loading' || status === 'missing' || !result) {
    return (
      <main
        className="ie-landing-type flex min-h-[50vh] items-center justify-center py-20"
        style={{ color: 'var(--text-primary)' }}
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'flex flex-col items-center gap-4 text-center')}>
          <Loader2 className="size-10 animate-spin" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          <p className="text-sm font-medium sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Loading your questions…
          </p>
        </div>
      </main>
    );
  }

  return <QuestionGeneratorResultsView questions={result.questions} meta={result.meta} />;
}
