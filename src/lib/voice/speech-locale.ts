/**
 * STT/TTS locale resolution for India + USA candidates.
 * Web Speech and Deepgram both consume the same BCP-47 tag.
 */
export type SttLocale = 'en-IN' | 'en-US'

const INDIA_TIMEZONES = new Set([
  'Asia/Kolkata',
  'Asia/Calcutta',
])

/** Resolve en-IN vs en-US from browser locale + timezone (product default: en-IN). */
export function resolveSttLocale(): SttLocale {
  if (typeof window === 'undefined') return 'en-IN'

  try {
    const stored = localStorage.getItem('ie-interview-language')
    if (stored === 'en-US' || stored === 'en-IN') return stored
  } catch {
    /* restricted storage */
  }

  const navLang = (navigator.language || 'en-IN').toLowerCase()
  if (navLang.startsWith('en-in') || navLang.startsWith('hi')) return 'en-IN'
  if (navLang.startsWith('en-us')) return 'en-US'

  let tz = ''
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    tz = ''
  }
  if (INDIA_TIMEZONES.has(tz)) return 'en-IN'
  if (tz.startsWith('America/')) return 'en-US'

  // Ambiguous `en` — prefer India (primary market) unless US timezone.
  if (navLang === 'en' || navLang.startsWith('en-')) {
    return tz.startsWith('America/') ? 'en-US' : 'en-IN'
  }

  return 'en-IN'
}
