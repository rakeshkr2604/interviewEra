/**
 * Campus deadline progress — one progress payload, many deadlines in memory.
 * Avoids re-fetching `user_progress` once per deadline.
 */

export type DeadlineProgressPick = {
  total_sessions: number | null
  current_tier: number | null
  overall_avg_score: number | null
}

export type DeadlineType = 'sessions' | 'tier' | 'score'

export type DeadlineProgressInput = {
  id: string
  deadline_type: DeadlineType
  target_value: number
  due_date: string
  description: string | null
  mandatory: boolean
  created_at: string
}

export type DeadlineWithProgress = DeadlineProgressInput & {
  totalStudents: number
  completedStudents: number
  completionPercentage: number
  daysRemaining: number
  isOverdue: boolean
}

export function studentMeetsDeadline(
  progress: DeadlineProgressPick,
  deadlineType: DeadlineType,
  targetValue: number,
): boolean {
  switch (deadlineType) {
    case 'sessions':
      return Number(progress.total_sessions ?? 0) >= targetValue
    case 'tier':
      return Number(progress.current_tier ?? 0) >= targetValue
    case 'score':
      return (
        progress.overall_avg_score !== null &&
        Number(progress.overall_avg_score) >= targetValue
      )
    default:
      return false
  }
}

export function computeDeadlineProgress(
  deadlines: DeadlineProgressInput[],
  progressRows: DeadlineProgressPick[],
  totalStudents: number,
  now = new Date(),
): DeadlineWithProgress[] {
  return deadlines.map((deadline) => {
    const completedStudents =
      totalStudents > 0
        ? progressRows.filter((row) =>
            studentMeetsDeadline(row, deadline.deadline_type, deadline.target_value),
          ).length
        : 0

    const dueDate = new Date(deadline.due_date)
    const daysRemaining = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const isOverdue = daysRemaining < 0

    return {
      ...deadline,
      totalStudents,
      completedStudents,
      completionPercentage:
        totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
      daysRemaining: Math.abs(daysRemaining),
      isOverdue,
    }
  })
}
