import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import type { PersonalizedRoadmap } from '@/lib/candidate/types';
import { RecommendationLink } from './RecommendationLink';

export function RoadmapPageContent({ roadmap }: { roadmap: PersonalizedRoadmap }) {
  return (
    <div className="space-y-6">
      <section className="dashboard-premium-card px-5 py-5 sm:px-7">
        <p className="dashboard-section-eyebrow">Target role</p>
        <h2 className="dashboard-section-title">{roadmap.targetRole}</h2>
        {roadmap.weakDimensions.length > 0 ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Prioritizing:{' '}
            {roadmap.weakDimensions.map((d) => REPORT_DIMENSION_LABELS[d]).join(', ')}
          </p>
        ) : (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Complete a mock interview to unlock dimension-specific recommendations.
          </p>
        )}
      </section>

      <section aria-labelledby="roadmap-interviews-heading">
        <h2 id="roadmap-interviews-heading" className="dashboard-section-title mb-3">
          Recommended interviews
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {roadmap.recommendedInterviews.map((item) => (
            <RecommendationLink
              key={item.id}
              href={item.href}
              recommendationId={item.id}
              recommendationType="interview"
              source="roadmap"
              className="dashboard-premium-card dashboard-hover-lift block min-h-11 px-4 py-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </p>
              <p className="mt-1 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                {item.difficulty} · {item.reason}
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            </RecommendationLink>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-topics-heading">
        <h2 id="roadmap-topics-heading" className="dashboard-section-title mb-3">
          Recommended topics
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {roadmap.recommendedTopics.map((topic) => (
            <article key={topic.id} className="dashboard-premium-card px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent-primary)' }}>
                {topic.priority} priority
              </p>
              <h3 className="mt-1 text-sm font-semibold">{topic.title}</h3>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {topic.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-questions-heading">
        <h2 id="roadmap-questions-heading" className="dashboard-section-title mb-3">
          Suggested practice questions
        </h2>
        <ol className="space-y-2">
          {roadmap.suggestedQuestions.map((q) => (
            <li
              key={q.id}
              className="dashboard-premium-card px-4 py-3 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {q.category}
              </span>
              {' — '}
              {q.question}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="roadmap-tools-heading">
        <h2 id="roadmap-tools-heading" className="dashboard-section-title mb-3">
          Suggested tools
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roadmap.suggestedTools.map((tool) => (
            <RecommendationLink
              key={tool.id}
              href={tool.href}
              recommendationId={tool.id}
              recommendationType="tool"
              source="roadmap"
              className="dashboard-premium-card dashboard-hover-lift block min-h-11 px-4 py-4"
            >
              <p className="text-sm font-semibold">{tool.title}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {tool.description}
              </p>
            </RecommendationLink>
          ))}
        </div>
      </section>
    </div>
  );
}
