import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SettingsSection({
  eyebrow,
  title,
  description,
  children,
  className,
  id,
  density = 'default',
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
  id?: string
  density?: 'default' | 'compact'
}) {
  const compact = density === 'compact'

  return (
    <section
      id={id}
      className={cn(compact ? 'space-y-2' : 'space-y-3 sm:space-y-4', className)}
    >
      <header className="px-0.5">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
          style={{ color: 'var(--accent-primary)' }}
        >
          {eyebrow}
        </p>
        <h2
          className={cn(
            'text-lg font-semibold tracking-tight sm:text-xl',
            compact ? 'mt-1' : 'mt-1.5',
          )}
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'mt-1 max-w-2xl leading-snug',
              compact ? 'text-[13px]' : 'text-sm leading-relaxed',
            )}
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </header>
      <div className={compact ? 'space-y-2' : 'space-y-3'}>{children}</div>
    </section>
  )
}
