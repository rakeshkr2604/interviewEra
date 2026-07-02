'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { PersonalizedRoadmap } from '@/lib/candidate/types';
import { trackCandidateEvent } from '@/lib/analytics/candidate-events';

export function RecommendationsStrip({ roadmap }: { roadmap: PersonalizedRoadmap }) {
  const top = roadmap.recommendedInterviews.slice(0, 2);

  if (top.length === 0) return null;

  return (
    <section className="dashboard-section" aria-labelledby="recommendations-heading">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} aria-hidden style={{ color: 'var(--accent-primary)' }} />
        <h2 id="recommendations-heading" className="dashboard-section-title !mt-0">
          Recommended next steps
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {top.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() =>
              trackCandidateEvent('recommendation_clicked', {
                recommendation_id: item.id,
                recommendation_type: 'interview',
                source: 'dashboard',
              })
            }
            className="dashboard-premium-card dashboard-hover-lift block min-h-11 px-4 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {item.reason}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
