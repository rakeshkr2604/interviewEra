'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { tierColorFromPercent } from '@/lib/utils/score-tier-color'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'
import type { DimensionKey } from '@/lib/interview/answer-score/rubric'
import { DIMENSION_EXPLAINERS } from '@/lib/interview/answer-score/rubric'

export interface SkillDetailRow {
  /** Current rubric dimension this score actually measures (for the explainer lookup). */
  rubricKey: DimensionKey
  name: string
  pct: number
}

interface SkillBreakdownDetailsDialogProps {
  skills: SkillDetailRow[]
  reportCount: number
}

function tierWord(pct: number): string {
  if (pct >= 75) return 'Strong'
  if (pct >= 50) return 'Solid'
  return 'Needs focus'
}

export function SkillBreakdownDetailsDialog({ skills, reportCount }: SkillBreakdownDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  if (skills.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold text-(--accent-primary) hover:underline ${IE_FOCUS_VISIBLE}`}
      >
        See details
        <ChevronRight className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[min(90dvh,42rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto overscroll-contain bg-(--card-bg) p-0 text-(--text-primary) sm:max-w-2xl"
          showCloseButton
        >
          <div className="sticky top-0 z-10 border-b border-(--card-border) bg-(--card-bg) px-5 py-4 pr-12">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-base font-bold tracking-wide text-(--accent-primary)">
                Skill breakdown — what it means
              </DialogTitle>
              <DialogDescription className="text-[12px] text-(--text-muted)">
                Averages across your last {reportCount || 0} report{reportCount === 1 ? '' : 's'} — what
                each dimension measures and why it matters.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-5 py-4">
            {skills.map((skill, i) => {
              const color = tierColorFromPercent(skill.pct)
              return (
                <motion.div
                  key={skill.rubricKey}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-xl border border-(--card-border) bg-(--bg-secondary)/50 p-3.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-(--text-primary)">{skill.name}</p>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color,
                          background: `color-mix(in srgb, ${color} 14%, transparent)`,
                        }}
                      >
                        {tierWord(skill.pct)}
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color }}>
                        {skill.pct}%
                      </span>
                    </div>
                  </div>

                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: 'var(--bg-tertiary)' }}
                    role="progressbar"
                    aria-valuenow={skill.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={skill.name}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${skill.pct}%`, background: color }}
                    />
                  </div>

                  <p className="mt-2 text-[12px] italic leading-relaxed text-(--text-muted)">
                    {DIMENSION_EXPLAINERS[skill.rubricKey]}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
