'use client'

interface TimerCircleProps {
  timeLeft: number
  totalTime: number
  size?: number
}

export function TimerCircle({ timeLeft, totalTime, size = 80 }: TimerCircleProps) {
  const percentage = (timeLeft / totalTime) * 100
  const strokeWidth = size >= 68 ? 7 : 6
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const innerFontPx = Math.max(15, Math.round(size * 0.24))

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
          fill="none" stroke="var(--bg-tertiary)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums leading-none"
        style={{ color, fontSize: innerFontPx }}
      >
        {timeLeft}s
      </span>
    </div>
  )
}
