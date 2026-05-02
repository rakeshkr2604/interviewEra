'use client'

interface CaptionDisplayProps {
  fullText: string
  currentWordIndex: number
}

export function CaptionDisplay({
  fullText,
  currentWordIndex,
}: CaptionDisplayProps) {
  if (!fullText) return null

  const cleanText = fullText.toLowerCase().replace(/[^\w\s]/g, ' ').trim()
  const words = cleanText.split(/\s+/).filter(Boolean)

  return (
    <div className="rounded-xl border border-(--card-border)
                    bg-(--card-bg) px-4 py-3 text-sm leading-relaxed
                    text-(--text-secondary)">
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={index === currentWordIndex
            ? 'rounded bg-(--accent-primary)/20 font-semibold text-(--text-primary)'
            : undefined}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  )
}
