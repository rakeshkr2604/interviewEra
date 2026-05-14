'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const RETENTION_REFRESH_EVENT = 'ie-streak-updated';

/** Re-runs Server Components after interview completion refreshes streak (and tier) data. */
export function RetentionProgressRefreshListener(): null {
  const router = useRouter();

  useEffect(() => {
    const refresh = (): void => {
      router.refresh();
    };
    window.addEventListener(RETENTION_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(RETENTION_REFRESH_EVENT, refresh);
  }, [router]);

  return null;
}
