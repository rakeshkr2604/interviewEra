'use client'
import { useState } from 'react'

interface CreditBadgeProps {
  creditsRemaining: number
}

export function CreditBadge({ creditsRemaining }: CreditBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const bg =
    creditsRemaining === 0
      ? 'var(--accent-danger)'
      : creditsRemaining <= 2
      ? 'var(--accent-warning)'
      : 'var(--accent-success)'

  return (
    <div className="relative inline-block">
      <span
        role="status"
        className="inline-flex cursor-pointer select-none items-center
                   rounded-full px-3 py-1 text-xs font-semibold text-white
                   transition-none"
        style={{ background: bg }}
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} left
      </span>

      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2
                     whitespace-nowrap rounded-lg px-3 py-1.5 text-xs
                     font-medium shadow-lg"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--card-border)',
          }}
        >
          Each interview uses 1 credit
        </div>
      )}
    </div>
  )
}
