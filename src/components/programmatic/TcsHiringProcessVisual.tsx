import {
  TCS_PROCESS_VISUAL_STEPS,
  TCS_PROCESS_VISUAL_TITLE,
} from '@/lib/seo/programmatic/tcs-hub'

type StepIcon = (typeof TCS_PROCESS_VISUAL_STEPS)[number]['icon']

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
    case 'nqt':
      return (
        <svg {...common}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4M7 8h4M7 12h10" />
        </svg>
      )
    case 'technical':
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'managerial':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'hr':
      return (
        <svg {...common}>
          <path d="M12 3a5 5 0 0 1 5 5v2H7V8a5 5 0 0 1 5-5z" />
          <path d="M7 10h10v2a5 5 0 0 1-10 0v-2z" />
          <path d="M9 18h6M10 21h4" />
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

export function TcsHiringProcessVisual() {
  return (
    <figure className="ie-fe-process-visual" aria-labelledby="tcs-process-visual-title">
      <div className="ie-fe-process-visual__inner">
        <p id="tcs-process-visual-title" className="ie-fe-process-visual__title">
          {TCS_PROCESS_VISUAL_TITLE}
        </p>

        <ol className="ie-tcs-process-flow" aria-label="TCS hiring stages">
          {TCS_PROCESS_VISUAL_STEPS.map((step, index) => (
            <li key={step.label} className="ie-tcs-process-flow__item">
              <span className="ie-tcs-process-flow__icon">
                <ProcessIcon kind={step.icon} />
              </span>
              <div className="ie-tcs-process-flow__text">
                <span className="ie-tcs-process-flow__label">{step.label}</span>
                <span className="ie-tcs-process-flow__signal">{step.signal}</span>
              </div>
              <span className="ie-tcs-process-flow__duration">{step.duration}</span>
              {index < TCS_PROCESS_VISUAL_STEPS.length - 1 ? (
                <span className="ie-tcs-process-flow__arrow" aria-hidden>
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}
