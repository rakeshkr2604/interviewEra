'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Auto-refresh while a concurrent report claim is still generating. */
export function ScriptReportGeneratingRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, 2000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
      Refreshing…
    </p>
  );
}
