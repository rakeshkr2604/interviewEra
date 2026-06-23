'use client'

import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function AgenticHubPromptCopy({
  text,
  label = 'Copy prompt',
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      className={`ie-agentic-prompt__copy${copied ? ' is-copied' : ''}`}
      onClick={copy}
      aria-label={label}
    >
      {copied ? <Check className="size-3.5 shrink-0" aria-hidden /> : <Copy className="size-3.5 shrink-0" aria-hidden />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
