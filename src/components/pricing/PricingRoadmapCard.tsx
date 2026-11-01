'use client';

import { useState, useSyncExternalStore } from 'react';
import { CalendarClock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { trackProductEventClient } from '@/lib/analytics/product-events';

/** Claude Code's terracotta accent — used here only for this "planned, not sold" notice. */
const UPCOMING_ACCENT = '#D97757';

const ROADMAP_ITEM = 'dsa';
const STORAGE_KEY = 'ie_roadmap_vote:dsa';

type Vote = 'interested' | 'not_interested';

function isVote(value: string | null): value is Vote {
  return value === 'interested' || value === 'not_interested';
}

function noopSubscribe(): () => void {
  return () => {};
}

/** Hydration-safe localStorage read — mirrors useCommunityStorageSnapshot. */
function getStoredVote(): Vote | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isVote(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getServerVote(): Vote | null {
  return null;
}

/** Durable curiosity signal — no entitlement, purchase or waitlist is created by voting. */
function persistRoadmapVote(vote: Vote): void {
  trackProductEventClient('roadmap_interest_submitted', { item: ROADMAP_ITEM, vote });
  void fetch('/api/analytics/funnel-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ event_name: 'roadmap_interest_submitted', item: ROADMAP_ITEM, vote }),
  }).catch(() => {
    /* best-effort */
  });
}

/**
 * Top-of-page notification strip. Planned release only — no entitlement,
 * purchase or waitlist exists for DSA yet. The Interested / Not interested
 * buttons are a lightweight curiosity signal, durably logged via
 * `roadmap_interest_submitted` (see AGENTS.md: product_events is the funnel SoT).
 */
export function PricingRoadmapCard() {
  const storedVote = useSyncExternalStore(noopSubscribe, getStoredVote, getServerVote);
  const [localVote, setLocalVote] = useState<Vote | null>(null);
  const vote = localVote ?? storedVote;

  const handleVote = (next: Vote) => {
    if (vote) return;
    setLocalVote(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore — storage may be unavailable (private mode, blocked, etc.) */
    }
    persistRoadmapVote(next);
  };

  return (
    <div
      className="border-b px-4 py-2.5 text-sm sm:px-6"
      style={{
        borderColor: `color-mix(in srgb, ${UPCOMING_ACCENT} 25%, var(--card-border))`,
        background: `color-mix(in srgb, ${UPCOMING_ACCENT} 8%, var(--bg-secondary))`,
      }}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${UPCOMING_ACCENT} 18%, transparent)` }}
          aria-hidden
        >
          <CalendarClock className="size-3.5" style={{ color: UPCOMING_ACCENT }} />
        </span>
        <p className="min-w-0 flex-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="mr-1.5 font-bold uppercase tracking-[0.1em]"
            style={{ color: UPCOMING_ACCENT, fontSize: '0.7rem' }}
          >
            Upcoming
          </span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            DSA Interview Preparation
          </span>{' '}
          is launching in January 2027 — not available yet, and not part of any current plan.
        </p>

        <div className="flex shrink-0 items-center gap-2" aria-live="polite">
          {vote ? (
            <span className="text-xs font-medium" style={{ color: UPCOMING_ACCENT }}>
              Thanks — your vote is noted!
            </span>
          ) : (
            <>
              <span
                className="hidden text-xs font-medium sm:inline"
                style={{ color: 'var(--text-muted)' }}
              >
                Want this?
              </span>
              <button
                type="button"
                onClick={() => handleVote('interested')}
                className="ie-focus-visible inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: `color-mix(in srgb, ${UPCOMING_ACCENT} 40%, var(--card-border))`,
                  color: UPCOMING_ACCENT,
                  background: `color-mix(in srgb, ${UPCOMING_ACCENT} 10%, transparent)`,
                }}
              >
                <ThumbsUp className="size-3" aria-hidden />
                Interested
              </button>
              <button
                type="button"
                onClick={() => handleVote('not_interested')}
                className="ie-focus-visible inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
              >
                <ThumbsDown className="size-3" aria-hidden />
                Not interested
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
