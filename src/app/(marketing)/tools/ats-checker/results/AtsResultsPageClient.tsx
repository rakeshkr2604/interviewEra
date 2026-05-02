'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AtsResultsView } from '../AtsResultsView';
import {
  ATS_RESULT_STORAGE_KEY,
  parseStoredAtsResult,
} from '../ats-result-storage';
import type { AtsResult } from '../ats-types';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

export function AtsResultsPageClient() {
  const router = useRouter();

  const [result] = useState<AtsResult | null>(() => {
    const raw = sessionStorage.getItem(ATS_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseStoredAtsResult(raw);
    if (!parsed) {
      sessionStorage.removeItem(ATS_RESULT_STORAGE_KEY);
      return null;
    }
    return parsed;
  });

  useEffect(() => {
    if (!result) {
      router.replace('/tools/ats-checker');
    }
  }, [result, router]);

  if (!result) {
    return (
      <main
        className="ie-landing-type flex min-h-[50vh] items-center justify-center py-20"
        style={{ color: 'var(--text-primary)' }}
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'flex flex-col items-center gap-4 text-center')}>
          <Loader2 className="size-10 animate-spin" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          <p className="text-sm font-medium sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Loading your report…
          </p>
        </div>
      </main>
    );
  }

  return <AtsResultsView result={result} />;
}
