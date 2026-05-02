'use client';

import { useState, useEffect } from 'react';

interface UseCreditsReturn {
  creditsRemaining: number | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useCredits(): UseCreditsReturn {
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function refresh() {
    setIsLoading(true);
    // TODO: fetch from /api/credits or Supabase directly in Phase 1 Week 2
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []); // mount-only: intentional

  void setCreditsRemaining;

  return { creditsRemaining, isLoading, refresh };
}
