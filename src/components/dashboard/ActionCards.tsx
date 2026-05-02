'use client'
import Link from 'next/link'

interface ActionCard {
  label: string
  description: string
  link: string
  cta: string
}

interface ActionCardsProps {
  cards: ActionCard[]
}

export function ActionCards({ cards }: ActionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      {cards.map((action) => (
        <Link
          key={action.label}
          href={action.link}
          className="dashboard-premium-card block px-5 py-5 transition-all duration-200 hover:-translate-y-0.5"
          style={{ textDecoration: 'none' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Action
          </p>
          <p
            className="mt-1 font-semibold text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {action.label}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {action.description}
          </p>
          <p
            className="mt-3 text-xs font-semibold"
            style={{ color: 'var(--accent-primary)' }}
          >
            {action.cta}
          </p>
        </Link>
      ))}
    </div>
  )
}
