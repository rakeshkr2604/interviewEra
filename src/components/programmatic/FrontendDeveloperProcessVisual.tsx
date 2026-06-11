import type { CSSProperties } from 'react'
import {
  FRONTEND_PROCESS_VISUAL_STATS,
  FRONTEND_PROCESS_VISUAL_STEPS,
  FRONTEND_PROCESS_VISUAL_TITLE,
} from '@/lib/seo/programmatic/frontend-developer-hub'

type StepIcon = (typeof FRONTEND_PROCESS_VISUAL_STEPS)[number]['icon']

function ProcessIcon({ kind }: { kind: StepIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (kind) {
    case 'application':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      )
    case 'assessment':
      return (
        <svg {...common}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4M7 8h4M7 12h10" />
        </svg>
      )
    case 'round1':
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'round2':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 9h8M8 13h5M8 17h3" />
        </svg>
      )
    case 'design':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'behavioral':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'offer':
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5z" />
          <path d="M3 12l9 5 9-5" />
        </svg>
      )
  }
}

export function FrontendDeveloperProcessVisual() {
  return (
    <figure className="ie-fe-process-visual" aria-labelledby="fe-process-visual-title">
      <div className="ie-fe-process-visual__inner">
        <p id="fe-process-visual-title" className="ie-fe-process-visual__title">
          {FRONTEND_PROCESS_VISUAL_TITLE}
        </p>

        <div className="ie-fe-process-visual__stats" aria-label="Process overview stats">
          {FRONTEND_PROCESS_VISUAL_STATS.map((stat) => (
            <div key={stat.label} className="ie-fe-process-visual__stat">
              <span className="ie-fe-process-visual__stat-value">{stat.value}</span>
              <span className="ie-fe-process-visual__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        <ol className="ie-fe-process-visual__timeline" aria-label="Interview stages">
          {FRONTEND_PROCESS_VISUAL_STEPS.map((step, index) => (
            <li key={step.label} className="ie-fe-process-visual__stage">
              <div className="ie-fe-process-visual__rail" aria-hidden>
                <span className="ie-fe-process-visual__num">{index + 1}</span>
                {index < FRONTEND_PROCESS_VISUAL_STEPS.length - 1 ? (
                  <span className="ie-fe-process-visual__connector" />
                ) : null}
              </div>

              <div className="ie-fe-process-visual__card">
                <div className="ie-fe-process-visual__card-head">
                  <span className="ie-fe-process-visual__icon">
                    <ProcessIcon kind={step.icon} />
                  </span>
                  <div className="ie-fe-process-visual__head-text">
                    <p className="ie-fe-process-visual__label">{step.label}</p>
                    <p className="ie-fe-process-visual__signal">{step.signal}</p>
                  </div>
                  <span className="ie-fe-process-visual__duration">{step.duration}</span>
                </div>

                <p className="ie-fe-process-visual__prep">{step.prep}</p>

                <div className="ie-fe-process-visual__topics" aria-label={`Topics for ${step.label}`}>
                  {step.topics.map((topic) => (
                    <span key={topic} className="ie-fe-process-visual__topic">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="ie-fe-process-visual__footer">
          <span className="ie-fe-process-visual__footer-label">Most tested across all rounds</span>
          <div className="ie-fe-process-visual__footer-topics">
            {['JavaScript', 'React', 'CSS', 'TypeScript', 'Performance'].map((topic) => (
              <span
                key={topic}
                className="ie-fe-process-visual__footer-topic"
                style={{ '--topic-weight': topic === 'JavaScript' ? '95%' : topic === 'React' ? '88%' : topic === 'CSS' ? '82%' : topic === 'TypeScript' ? '75%' : '72%' } as CSSProperties}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}
