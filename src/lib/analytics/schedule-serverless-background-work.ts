/**
 * Schedules non-blocking work to survive the serverless response lifecycle.
 * Uses Next.js `after()` → platform waitUntil on Vercel. Falls back to
 * immediate execution outside a request context (unit tests, scripts).
 */

import { after } from 'next/server';

export function scheduleServerlessBackgroundWork(task: () => Promise<void>): void {
  try {
    after(() => {
      void task();
    });
  } catch {
    void task();
  }
}
