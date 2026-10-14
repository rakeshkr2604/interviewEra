'use client'

import { useState } from 'react'
import { copyText } from '@/lib/prep/copy-text'
import {
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
} from '@/lib/theme/component-classes'

export function CopyStaticPrompt({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={IE_MARKETING_CTA_SECONDARY_CLASS}
        style={IE_MARKETING_CTA_SECONDARY_STYLE}
        onClick={() => {
          void copyText(text).then((result) => {
            setStatus(result === 'copied' ? 'copied' : 'failed')
          })
        }}
      >
        {label}
      </button>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }} role="status">
        {status === 'copied' ? 'Copied. Paste it into your own ChatGPT chat.' : null}
        {status === 'failed' ? 'Copy failed. Select the prompt and copy it manually.' : null}
      </p>
    </div>
  )
}
