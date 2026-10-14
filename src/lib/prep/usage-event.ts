import { z } from 'zod'
import { PREP_GOALS, type PrepGoal } from '@/lib/prep/prompt-builder'

const usageSchema = z
  .object({
    goal: z.enum(PREP_GOALS),
  })
  .strict()

/** Closed usage payload. Resume text, prompts, and job descriptions are rejected. */
export function parsePromptBuilderUsage(input: unknown): { goal: PrepGoal } | null {
  const parsed = usageSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}
