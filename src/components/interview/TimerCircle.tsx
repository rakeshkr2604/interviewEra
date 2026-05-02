'use client'

interface TimerCircleProps {
  timeLeft: number
  totalTime: number
  size?: number
}

export function TimerCircle({ timeLeft, totalTime, size = 80 }: TimerCircleProps) {
  const percentage = (timeLeft / totalTime) * 100
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const color =
    percentage > 50 ? 'var(--accent-success)'
    : percentage > 25 ? 'var(--accent-warning)'
    : 'var(--accent-danger)'

  return (
    <div className="relative flex items-center justify-center"
         style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--bg-tertiary)" strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-bold"
            style={{ color }}>
        {timeLeft}s
      </span>
    </div>
  )
}
