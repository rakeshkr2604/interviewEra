'use client';

import { useState } from 'react';
import { ChevronDown, Lightbulb, type LucideIcon } from 'lucide-react';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import type { RoadmapTopicRecommendation } from '@/lib/candidate/types';
import { RecommendationLink } from './RecommendationLink';
import { RoadmapBulletList } from './RoadmapBulletList';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: 'var(--accent-danger)',
  medium: 'var(--accent-primary)',
  low: 'var(--accent-warning)',
};

export function RoadmapTopicCard({
  topic,
  icon: Icon,
  iconColor,
  targetRole,
}: {
  topic: RoadmapTopicRecommendation;
  icon: LucideIcon;
  iconColor: string;
  targetRole: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = PRIORITY_COLOR[topic.priority];

  const practiceHref = `${getDefaultInterviewStartPath()}?${new URLSearchParams({
    role: targetRole,
    focus: topic.dimension,
    mode: topic.dimension === 'technical_depth' ? 'technical' : 'mixed',
  }).toString()}`;

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
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ color: priorityColor, background: `color-mix(in srgb, ${priorityColor} 14%, transparent)` }}
          >
            {topic.priority} priority
          </span>
          <h3 className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {topic.title}
          </h3>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {topic.description}
      </p>

      {topic.currentScore != null ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round((topic.currentScore / 10) * 100)}%`, background: iconColor }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {topic.currentScore.toFixed(1)}/10
          </span>
        </div>
      ) : null}

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
          <Lightbulb className="size-3.5" aria-hidden />
          {expanded ? 'Hide prep guide' : 'View prep guide'}
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
          <RoadmapBulletList title="Key actions" items={topic.guide.keyActions} />
          <RoadmapBulletList title="Common mistakes" items={topic.guide.commonMistakes} />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Quick win
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {topic.guide.quickWin}
            </p>
          </div>
          <RecommendationLink
            href={practiceHref}
            recommendationId={topic.id}
            recommendationType="topic"
            source="roadmap"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${iconColor}, color-mix(in srgb, ${iconColor} 70%, black))` }}
          >
            Practice this topic
            <span aria-hidden>→</span>
          </RecommendationLink>
        </div>
      )}
    </article>
  );
}
