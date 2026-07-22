'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { IE_SPINNER_LG_CLASS } from '@/lib/theme/component-classes';

/** Client poll interval while a concurrent claim is still generating. */
const POLL_INTERVAL_MS = 2_500;
/**
 * Synthesis LLM timeout is 22s; after this wall time show the delayed CTA
 * and stop polling so we don't refresh forever.
 */
const DELAYED_AFTER_MS = 25_000;
/** Ignore a stale wait marker from a previous visit (e.g. closed tab). */
const WAIT_MARKER_MAX_AGE_MS = 5 * 60_000;

const WAIT_STARTED_KEY_PREFIX = 'ie:script-report-wait:';

type Phase = 'waiting' | 'delayed';

export interface ScriptReportGeneratingRefreshProps {
  /**
   * When true (default), call `router.refresh()` on an interval until the
   * delayed threshold. Use false for Suspense `loading.tsx` — the RSC will
   * replace the tree when generation finishes.
   */
  poll?: boolean;
  /**
   * When true, wrap content with the same dashboard header chrome used on the
   * report page (needed for route-level `loading.tsx`).
   */
  withChrome?: boolean;
}

function readWaitStartedAt(storageKey: string): number {
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(storageKey);
    const parsed = raw ? Number(raw) : NaN;
    if (
      Number.isFinite(parsed) &&
      parsed > 0 &&
      now - parsed < WAIT_MARKER_MAX_AGE_MS
    ) {
      return parsed;
    }
  } catch {
    // private mode / blocked storage — fall through
  }
  try {
    sessionStorage.setItem(storageKey, String(now));
  } catch {
    // ignore
  }
  return now;
}

function clearWaitStartedAt(storageKey: string): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

function resetWaitStartedAt(storageKey: string): number {
  const now = Date.now();
  try {
    sessionStorage.setItem(storageKey, String(now));
  } catch {
    // ignore
  }
  return now;
}

/**
 * Waiting / delayed UI while a script report is still generating.
 * Polls via soft navigation refresh; stops after {@link DELAYED_AFTER_MS}.
 * Wait start is stored in sessionStorage so `router.refresh()` remounts
 * don't reset the delayed threshold.
 */
export function ScriptReportGeneratingRefresh({
  poll = true,
  withChrome = false,
}: ScriptReportGeneratingRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = `${WAIT_STARTED_KEY_PREFIX}${pathname}`;
  const [phase, setPhase] = useState<Phase>('waiting');

  useEffect(() => {
    const startedAt = readWaitStartedAt(storageKey);
    const applyPhase = () => {
      if (Date.now() - startedAt >= DELAYED_AFTER_MS) {
        setPhase('delayed');
        return true;
      }
      setPhase('waiting');
      return false;
    };

    if (applyPhase()) return;

    const id = window.setInterval(() => {
      if (applyPhase()) {
        window.clearInterval(id);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [storageKey]);

  useEffect(() => {
    if (!poll || phase !== 'waiting') return;
    const id = window.setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router, poll, phase]);

  const panel =
    phase === 'waiting' ? (
      <section
        className="dashboard-premium-card px-6 py-8 text-center sm:px-7"
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="script-report-waiting"
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
          }}
          aria-hidden
        >
          <Loader2
            className={`h-6 w-6 text-(--accent-primary) ${IE_SPINNER_LG_CLASS}`}
          />
        </div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          Preparing report
        </p>
        <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Your report is being generated
        </h2>
        <p
          className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          This usually takes a few seconds. We&apos;ll show it here as soon as it&apos;s ready.
        </p>
      </section>
    ) : (
      <section
        className="dashboard-premium-card px-6 py-8 text-center sm:px-7"
        role="status"
        aria-live="polite"
        data-testid="script-report-delayed"
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--accent-warning)' }}
        >
          Still working
        </p>
        <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          This is taking longer than usual
        </h2>
        <p
          className="mx-auto mt-3 max-w-md text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          You can check back later — your report will also be available anytime from{' '}
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Interview History
          </span>
          .
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/history"
            className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] px-3 text-sm font-semibold text-white"
            style={{ background: 'var(--accent-primary)' }}
            onClick={() => clearWaitStartedAt(storageKey)}
          >
            Interview History
          </Link>
          <button
            type="button"
            onClick={() => {
              resetWaitStartedAt(storageKey);
              setPhase('waiting');
              router.refresh();
            }}
            className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] border-2 px-3 text-sm font-semibold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
          >
            Try again
          </button>
        </div>
      </section>
    );

  if (!withChrome) {
    return panel;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DashboardPageHeader
        eyebrow="v2.1 report"
        title="Interview report"
        subtitle="score-v1.2 session feedback"
        backHref="/history"
        backLabel="Interview history"
      />
      {panel}
    </div>
  );
}
