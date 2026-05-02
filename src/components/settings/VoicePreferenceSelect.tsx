'use client'

import { useState } from 'react'

const STORAGE_KEY = 'ie-voice-preference'

export function VoicePreferenceSelect() {
  const [value, setValue] = useState<'female' | 'male'>(() => {
    if (typeof window === 'undefined') return 'female'
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'female' || stored === 'male' ? stored : 'female'
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (next: 'female' | 'male') => {
    setValue(next)
    localStorage.setItem(STORAGE_KEY, next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as 'female' | 'male')}
        className="w-full cursor-pointer appearance-none rounded-xl border-2 px-4 py-3 text-sm font-medium"
        style={{
          background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
          color: 'var(--text-primary)',
          borderColor: 'var(--card-border)',
        }}
      >
        <option value="female">Female (Priya)</option>
        <option value="male">Male (Arjun)</option>
      </select>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Voice availability depends on your browser/device voices.
        </p>
        {saved && (
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-success, #16a34a)' }}>
            Saved
          </p>
        )}
      </div>
    </div>
  )
}
