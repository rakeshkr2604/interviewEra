'use client'

interface PlacementCountdownProps {
  placementDate: string
  interviewsCompleted: number
}

export function PlacementCountdown({
  placementDate,
  interviewsCompleted,
}: PlacementCountdownProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const placement = new Date(placementDate)
  placement.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil(
    (placement.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysLeft < 0) return null

  const color =
    daysLeft > 30
      ? 'var(--accent-success)'
      : daysLeft >= 10
      ? 'var(--accent-warning)'
      : 'var(--accent-danger)'

  return (
    <div
      className="flex items-center gap-2 rounded-full px-4 py-1.5
                 text-xs font-semibold"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      📅 {daysLeft}d to placement &nbsp;·&nbsp;
      {interviewsCompleted}/20 interviews done
    </div>
  )
}
