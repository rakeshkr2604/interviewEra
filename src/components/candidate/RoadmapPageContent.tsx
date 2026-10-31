'use client'

import { motion, useReducedMotion } from 'motion/react'
import {
  Briefcase,
  ChevronRight,
  Video,
  FileText,
  Users,
  FileCheck,
  Sparkles,
  MessageCircle,
  Code2,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions'
import { V1_KEY_TO_RUBRIC_KEY } from '@/lib/interview/script-dimension-bridge'
import { DIMENSION_IDENTITY } from '@/lib/utils/dimension-identity'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import type { PersonalizedRoadmap } from '@/lib/candidate/types'
import { RecommendationLink } from './RecommendationLink'
import { RoadmapQuestionCard } from './RoadmapQuestionCard'
import { RoadmapTopicCard } from './RoadmapTopicCard'
import { RoadmapInterviewCard } from './RoadmapInterviewCard'

const INTERVIEW_ICON: Record<string, LucideIcon> = {
  'mock-weak-dimension': Video,
  'mock-resume': FileText,
  'mock-behavioral': Users,
}
const INTERVIEW_ICON_COLOR: Record<string, string> = {
  'mock-weak-dimension': '#7c3aed',
  'mock-resume': '#2563eb',
  'mock-behavioral': '#16a34a',
}

const TOOL_ICON: Record<string, LucideIcon> = {
  'tool-ats': FileCheck,
  'tool-star': Sparkles,
  'tool-questions': MessageCircle,
  'tool-dsa': Code2,
}
const TOOL_ICON_COLOR: Record<string, string> = {
  'tool-ats': '#16a34a',
  'tool-star': '#7c3aed',
  'tool-questions': '#ea580c',
  'tool-dsa': '#2563eb',
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay },
  }
}

export function RoadmapPageContent({ roadmap }: { roadmap: PersonalizedRoadmap }) {
  const prefersReducedMotion = useReducedMotion()
  const fade = (delay: number) => (prefersReducedMotion ? {} : fadeUp(delay))

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Plan"
        title="Personalized roadmap"
        subtitle="Recommended interviews, topics, and tools based on your weakest dimensions."
        backHref="/readiness"
        backLabel="Back to readiness"
      />

      {/* Target role hero — the "Start mock interview" CTA replaces the old
          decorative backdrop illustration outright (the two overlapped: the
          illustration's flag graphic poked out from behind the button). */}
      <section className="dashboard-premium-card relative overflow-hidden px-5 py-4 sm:px-6">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
          <div className="flex items-start gap-3.5 sm:flex-1 sm:items-center">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--accent-primary)',
              }}
              aria-hidden
            >
              <Briefcase className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Target role
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {roadmap.targetRole}
                </h2>
                {roadmap.weakDimensions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Prioritizing
                    </span>
                    {roadmap.weakDimensions.map((d) => (
                      <span
                        key={d}
                        className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          color: 'var(--accent-primary)',
                          background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                        }}
                      >
                        {REPORT_DIMENSION_LABELS[d]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Complete a mock interview to unlock recommendations.
                  </p>
                )}
              </div>
            </div>
          </div>
          {roadmap.recommendedInterviews[0] ? (
            <Link
              href={roadmap.recommendedInterviews[0].href}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02] sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              }}
            >
              Start mock interview
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Recommended interviews */}
      <section aria-labelledby="roadmap-interviews-heading">
        <h2 id="roadmap-interviews-heading" className="dashboard-section-title mb-3">
          Recommended interviews
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {roadmap.recommendedInterviews.map((item, i) => {
            const Icon = INTERVIEW_ICON[item.id] ?? Video
            const color = INTERVIEW_ICON_COLOR[item.id] ?? 'var(--accent-primary)'
            return (
              <motion.div key={item.id} {...fade(i * 0.06)}>
                <RoadmapInterviewCard item={item} icon={Icon} iconColor={color} />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Recommended topics */}
      <section aria-labelledby="roadmap-topics-heading">
        <h2 id="roadmap-topics-heading" className="dashboard-section-title mb-3">
          Recommended topics
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {roadmap.recommendedTopics.map((topic, i) => {
            const identity = DIMENSION_IDENTITY[V1_KEY_TO_RUBRIC_KEY[topic.dimension]]
            const Icon = identity?.icon ?? FileText
            const iconColor = identity?.color ?? 'var(--accent-primary)'
            return (
              <motion.div key={topic.id} {...fade(i * 0.06)}>
                <RoadmapTopicCard topic={topic} icon={Icon} iconColor={iconColor} targetRole={roadmap.targetRole} />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Suggested practice questions */}
      <section aria-labelledby="roadmap-questions-heading">
        <h2 id="roadmap-questions-heading" className="dashboard-section-title mb-3">
          Suggested practice questions
        </h2>
        <ol className="space-y-3">
          {roadmap.suggestedQuestions.map((q, i) => (
            <motion.li key={q.id} {...fade(i * 0.04)}>
              <RoadmapQuestionCard order={i + 1} question={q} targetRole={roadmap.targetRole} />
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Suggested tools */}
      <section aria-labelledby="roadmap-tools-heading">
        <h2 id="roadmap-tools-heading" className="dashboard-section-title mb-3">
          Suggested tools
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roadmap.suggestedTools.map((tool, i) => {
            const Icon = TOOL_ICON[tool.id] ?? Sparkles
            const color = TOOL_ICON_COLOR[tool.id] ?? 'var(--accent-primary)'
            return (
              <motion.div key={tool.id} {...fade(i * 0.06)}>
                <RecommendationLink
                  href={tool.href}
                  recommendationId={tool.id}
                  recommendationType="tool"
                  source="roadmap"
                  className="dashboard-premium-card dashboard-hover-lift relative flex min-h-11 items-start gap-3 px-4 py-4 pr-10"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{tool.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {tool.description}
                    </p>
                  </span>
                  <ChevronRight
                    className="absolute right-3 top-4 size-4"
                    style={{ color: 'var(--text-muted)' }}
                    aria-hidden
                  />
                </RecommendationLink>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
