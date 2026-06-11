import type { CSSProperties } from 'react'
import {
  SOFTWARE_ENGINEER_HERO_COMPANIES,
  SOFTWARE_ENGINEER_HERO_ROADMAP_STEPS,
  SOFTWARE_ENGINEER_HERO_VISUAL_TITLE,
} from '@/lib/seo/programmatic/software-engineer-hub'

function RoadmapIcon({ kind }: { kind: (typeof SOFTWARE_ENGINEER_HERO_ROADMAP_STEPS)[number]['icon'] }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

  switch (kind) {
    case 'code':
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'dsa':
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="6" cy="19" r="2" />
          <circle cx="18" cy="19" r="2" />
          <path d="M12 7v4M8.5 17.5 11 13M15.5 17.5 13 13" />
        </svg>
      )
    case 'oop':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
          <path d="M11 7h2v4h-2zM13 13v2h4v-2" />
        </svg>
      )
    case 'dbms':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      )
    case 'design':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="7" height="7" rx="1" />
          <rect x="14" y="8" width="7" height="7" rx="1" />
          <path d="M10 11.5h4M7 15h10" />
        </svg>
      )
    case 'behavioral':
      return (
        <svg {...common}>
          <path d="M12 3a5 5 0 0 1 5 5v2H7V8a5 5 0 0 1 5-5z" />
          <path d="M7 10h10v2a5 5 0 0 1-10 0v-2z" />
          <path d="M9 18h6M10 21h4" />
        </svg>
      )
    case 'mock':
      return (
        <svg {...common}>
          <path d="M12 2a3 3 0 0 1 3 3v1H9V5a3 3 0 0 1 3-3z" />
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M9 11h6M9 14h4" />
        </svg>
      )
    case 'offer':
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5z" />
          <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      )
  }
}

export function SoftwareEngineerHeroVisual() {
  return (
    <figure
      className="ie-swe-hero-visual"
      aria-labelledby="swe-hero-visual-title"
    >
      <div className="ie-swe-hero-visual__inner">
        <p id="swe-hero-visual-title" className="ie-swe-hero-visual__title">
          {SOFTWARE_ENGINEER_HERO_VISUAL_TITLE}
        </p>

        <ol className="ie-swe-hero-visual__roadmap" aria-label="Career preparation path">
          {SOFTWARE_ENGINEER_HERO_ROADMAP_STEPS.map((step, index) => (
            <li key={step.label} className="ie-swe-hero-visual__step">
              <span className="ie-swe-hero-visual__step-icon">
                <RoadmapIcon kind={step.icon} />
              </span>
              <span className="ie-swe-hero-visual__step-label">{step.label}</span>
              {index < SOFTWARE_ENGINEER_HERO_ROADMAP_STEPS.length - 1 ? (
                <span className="ie-swe-hero-visual__arrow" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="ie-swe-hero-visual__companies" aria-label="Target companies">
          {SOFTWARE_ENGINEER_HERO_COMPANIES.map((company) => (
            <span
              key={company.name}
              className="ie-swe-hero-visual__company"
              style={{ '--company-accent': company.accent } as CSSProperties}
            >
              <span className="ie-swe-hero-visual__company-mark" aria-hidden>
                {company.mark}
              </span>
              <span className="ie-swe-hero-visual__company-name">{company.name}</span>
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}
