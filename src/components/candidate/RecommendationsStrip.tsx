'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import type { PersonalizedRoadmap } from '@/lib/candidate/types';
import { trackCandidateEvent } from '@/lib/analytics/candidate-events';

export function RecommendationsStrip({ roadmap }: { roadmap: PersonalizedRoadmap }) {
  const top = roadmap.recommendedInterviews.slice(0, 3);

  if (top.length === 0) return null;

  return (
    <section className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5" aria-labelledby="recommendations-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} aria-hidden style={{ color: 'var(--accent-primary)' }} />
          <h2 id="recommendations-heading" className="dashboard-section-title !mt-0">
            Recommended next steps
          </h2>
        </div>
        <Link href="/roadmap" className="shrink-0 text-xs font-semibold hover:underline" style={{ color: 'var(--accent-primary)' }}>
          View full roadmap →
        </Link>
      </div>
      <ol className="space-y-2.5">
        {top.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.reason}
              </p>
            </div>
            <Link
              href={item.href}
              onClick={() =>
                trackCandidateEvent('recommendation_clicked', {
                  recommendation_id: item.id,
                  recommendation_type: 'interview',
                  source: 'dashboard',
                })
              }
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--accent-primary)' }}
            >
              Start
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
