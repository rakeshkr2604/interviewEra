'use client';

import { useState } from 'react';
import { ChevronDown, Info, type LucideIcon } from 'lucide-react';
import type { RoadmapInterviewRecommendation } from '@/lib/candidate/types';
import { RecommendationLink } from './RecommendationLink';
import { RoadmapBulletList } from './RoadmapBulletList';
import { cn } from '@/lib/utils';

const DIFFICULTY_COLOR: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'var(--accent-success)',
  medium: 'var(--accent-warning)',
  hard: 'var(--accent-danger)',
};

export function RoadmapInterviewCard({
  item,
  icon: Icon,
  iconColor,
}: {
  item: RoadmapInterviewRecommendation;
  icon: LucideIcon;
  iconColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const difficultyColor = DIFFICULTY_COLOR[item.difficulty];

  return (
    <article
      className="dashboard-premium-card space-y-3 px-4 py-4"
      style={{ borderColor: expanded ? 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))' : undefined }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${iconColor} 15%, transparent)`, color: iconColor }}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: difficultyColor, background: `color-mix(in srgb, ${difficultyColor} 14%, transparent)` }}
            >
              {item.difficulty}
            </span>
            {item.reason}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {item.description}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Info className="size-3.5" aria-hidden />
          {expanded ? 'Hide details' : 'What to expect'}
          <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
        </button>
      </div>

      {expanded && (
        <div
          className="space-y-4 rounded-xl border-2 p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 24%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
          }}
        >
          <RoadmapBulletList title="What to expect" items={item.guide.whatToExpect} />
          <RoadmapBulletList title="How to prepare" items={item.guide.howToPrepare} />
          <RecommendationLink
            href={item.href}
            recommendationId={item.id}
            recommendationType="interview"
            source="roadmap"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 72%, #5b21b6))' }}
          >
            Start this interview
            <span aria-hidden>→</span>
          </RecommendationLink>
        </div>
      )}
    </article>
  );
}
