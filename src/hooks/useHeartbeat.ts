'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// 2-minute interval — reduces DB writes while still tracking approximate presence.
// "Currently online" threshold is 5 min, so a 2-min heartbeat gives 2+ beats
// within the window — good enough accuracy at a fraction of the write cost.
const INTERVAL_MS = 120_000;

export function useHeartbeat(enabled = true) {
  const pathname    = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Safe SSR initialisation: document does not exist on the server.
  const isVisibleRef = useRef(true);

  const send = useCallback(async () => {
    if (!enabled || !isVisibleRef.current) return;
    try {
      await fetch('/api/activity/heartbeat', {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ current_page: pathname }),
        keepalive: true,
      });
    } catch {
      // Non-critical — never surface heartbeat failures to the user.
    }
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    isVisibleRef.current = !document.hidden;

    const onVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      // Send immediately when tab becomes visible again after being hidden.
      if (!document.hidden) void send();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void send();
    intervalRef.current = setInterval(send, INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [send, enabled]);
}
