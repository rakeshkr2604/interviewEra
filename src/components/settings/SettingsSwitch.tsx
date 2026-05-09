'use client'

import { cn } from '@/lib/utils'

export function SettingsSwitch({
  checked,
  onCheckedChange,
  disabled,
  id,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
        'disabled:pointer-events-none disabled:opacity-45',
        checked
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
          : 'border-[var(--card-border)] bg-[var(--bg-tertiary)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
