import type { ReactNode } from 'react'

type Variant = 'insight' | 'tip' | 'warning' | 'compare'

const VARIANT_LABEL: Record<Variant, string> = {
  insight: 'Insight',
  tip: 'Pro tip',
  warning: 'Watch out',
  compare: 'Quick compare',
}

export function AgenticHubCallout({
  variant = 'insight',
  title,
  children,
}: {
  variant?: Variant
  title?: string
  children: ReactNode
}) {
  return (
    <aside className={`ie-agentic-hub-callout ie-agentic-hub-callout--${variant}`} role="note">
      <p className="ie-agentic-hub-callout__eyebrow">{VARIANT_LABEL[variant]}</p>
      {title ? <p className="ie-agentic-hub-callout__title">{title}</p> : null}
      <div className="ie-agentic-hub-callout__body">{children}</div>
    </aside>
  )
}

export function AgenticHubCompareCards({
  leftTitle,
  rightTitle,
  left,
  right,
}: {
  leftTitle: string
  rightTitle: string
  left: ReactNode
  right: ReactNode
}) {
  return (
    <div className="ie-agentic-hub-compare-grid" role="group" aria-label="Comparison">
      <div className="ie-agentic-hub-compare-card ie-agentic-hub-compare-card--weak">
        <p className="ie-agentic-hub-compare-card__label">{leftTitle}</p>
        {left}
      </div>
      <div className="ie-agentic-hub-compare-card ie-agentic-hub-compare-card--strong">
        <p className="ie-agentic-hub-compare-card__label">{rightTitle}</p>
        {right}
      </div>
    </div>
  )
}
