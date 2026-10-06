import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BRAND_COLORS,
  BRAND_ICON_192_PATH,
  BRAND_ICON_SQUARE_PATH,
  BRAND_LOGO_HORIZONTAL_PATH,
  BRAND_LOGO_VERTICAL_PATH,
  BRAND_MARK_PATH,
  BRAND_MONOGRAM_NAV_PATH,
  BRAND_TAGLINE,
  BRAND_WORDMARK_NAV_PATH,
} from './assets'

function publicFile(urlPath: string) {
  const clean = urlPath.replace(/^\//, '').split('?')[0] ?? urlPath
  return path.join(process.cwd(), 'public', clean)
}

describe('brand assets (Logo Package v1)', () => {
  it('exposes approved brand color approximations', () => {
    expect(BRAND_COLORS.primaryPurple).toBe('#5B21F4')
    expect(BRAND_COLORS.deepNavy).toBe('#09062D')
    expect(BRAND_COLORS.secondaryViolet).toBe('#9B6CFF')
  })

  it('maps compact mark alias to UI square', () => {
    expect(BRAND_MARK_PATH).toBe(BRAND_ICON_SQUARE_PATH)
  })

  it('exposes approved package tagline', () => {
    expect(BRAND_TAGLINE).toBe('PRACTICE • PREPARE • PROGRESS')
  })

  it('ships required production files under public/', () => {
    const required = [
      BRAND_ICON_SQUARE_PATH,
      BRAND_LOGO_HORIZONTAL_PATH,
      BRAND_MONOGRAM_NAV_PATH,
      BRAND_WORDMARK_NAV_PATH,
      BRAND_LOGO_VERTICAL_PATH,
      BRAND_ICON_192_PATH,
      '/favicon.ico',
      '/favicon/favicon-16x16.png',
      '/favicon/favicon-32x32.png',
      '/favicon/apple-touch-icon.png',
      '/favicon/android-chrome-512x512.png',
      '/site.webmanifest',
    ]
    for (const urlPath of required) {
      expect(existsSync(publicFile(urlPath)), `missing ${urlPath}`).toBe(true)
    }
  })
})
