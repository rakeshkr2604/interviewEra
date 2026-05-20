'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const CHECKLIST_ITEMS_FULL = [
  { id: 'quiet',   label: 'I am in a quiet room',           desc: 'Background noise affects scoring',    icon: '🔇' },
  { id: 'mic',     label: 'My microphone is working',        desc: 'Voice input powers the interview',    icon: '🎤' },
  { id: 'internet',label: 'Stable internet connection',      desc: 'Needed for real-time AI responses',   icon: '📶' },
  { id: 'time',    label: '15–20 minutes free',              desc: 'Uninterrupted focus matters',         icon: '⏱️' },
  { id: 'formal',  label: 'Professional tone ready',         desc: 'Treat it like the real thing',        icon: '👔' },
] as const

const CHECKLIST_ITEMS_QUICK = [
  { id: 'quiet', label: 'Quiet environment',   desc: 'Background noise affects scoring', icon: '🔇' },
  { id: 'mic',   label: 'Microphone working',  desc: 'Required for voice responses',     icon: '🎤' },
  { id: 'time',  label: '~15 minutes free',    desc: 'Uninterrupted focus time',         icon: '⏱️' },
] as const

interface BriefingChecklistProps {
  onAllChecked: (allChecked: boolean) => void
  onCheckedCountChange?: (count: number) => void
  compact?: boolean
  variant?: 'full' | 'quick'
}

export function BriefingChecklist({
  onAllChecked,
  onCheckedCountChange,
  compact = false,
  variant = 'full',
}: BriefingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const items = variant === 'quick' ? CHECKLIST_ITEMS_QUICK : CHECKLIST_ITEMS_FULL

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    const count = items.filter((item) => next[item.id]).length
    onCheckedCountChange?.(count)
    onAllChecked(count === items.length)
  }

  const checkedCount = items.filter((item) => checked[item.id]).length
  const allDone = checkedCount === items.length

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      {!compact && (
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--bg-secondary)">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--accent-success)' }}
              initial={{ width: 0 }}
              animate={{ width: `${(checkedCount / items.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-(--text-muted)">
            {checkedCount}/{items.length}
          </span>
        </div>
      )}

      {items.map((item) => {
        const isChecked = !!checked[item.id]
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border text-left transition-all duration-200',
              compact ? 'p-2.5' : 'p-3',
              isChecked
                ? 'border-(--accent-success)/35'
                : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/30',
            )}
            style={isChecked
              ? { background: 'color-mix(in srgb, var(--accent-success) 7%, var(--card-bg))' }
              : undefined}
            aria-pressed={isChecked}
          >
            {/* Animated circle check */}
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                compact ? 'size-5' : 'size-[1.35rem]',
                isChecked ? 'border-(--accent-success) bg-(--accent-success)' : 'border-(--card-border)',
              )}
            >
              <AnimatePresence>
                {isChecked && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  >
                    <Check
                      className={cn('text-white', compact ? 'size-2.5' : 'size-3')}
                      strokeWidth={3}
                      aria-hidden
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Label */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'font-medium transition-colors duration-200',
                  compact ? 'text-xs' : 'text-[13px]',
                  isChecked ? 'text-(--accent-success)' : 'text-(--text-primary)',
                )}
              >
                {item.label}
              </p>
              {!compact && (
                <p className="mt-0.5 text-[11px] text-(--text-muted)">{item.desc}</p>
              )}
            </div>
          </motion.button>
        )
      })}

      {/* All-done confirmation */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="rounded-xl border border-(--accent-success)/30 bg-(--accent-success)/10 p-2.5 text-center"
          >
            <p className="text-xs font-semibold text-(--accent-success)">
              ✓ You&apos;re ready to begin
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
