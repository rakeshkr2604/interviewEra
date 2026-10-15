import { describe, expect, it } from 'vitest'
import { COMMUNITY_HUB_PATH } from './community'
import { COMMUNITY_BANNER_BOOT_ATTR, communityBannerBootScript } from './storage'

const DAY = 24 * 60 * 60 * 1000

function runBoot(pathname: string, store: Record<string, string>, throwOnRead = false): string | null {
  const attrs: Record<string, string> = {}
  const localStorage = {
    getItem: (k: string) => {
      if (throwOnRead) throw new Error('blocked')
      return k in store ? store[k] : null
    },
  }
  const document = {
    documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) },
  }
  new Function('location', 'localStorage', 'document', communityBannerBootScript(COMMUNITY_HUB_PATH))(
    { pathname },
    localStorage,
    document,
  )
  return attrs[COMMUNITY_BANNER_BOOT_ATTR] ?? null
}

describe('communityBannerBootScript', () => {
  it('reserves the strip for a first-time visitor', () => {
    expect(runBoot('/blog', {})).toBe('show')
  })

  it('skips the community hub and its children', () => {
    expect(runBoot('/community', {})).toBeNull()
    expect(runBoot('/community/whatsapp', {})).toBeNull()
  })

  it('skips visitors who joined a platform', () => {
    expect(runBoot('/', { 'ie-community-joined-platforms': '["whatsapp"]' })).toBeNull()
    expect(runBoot('/', { 'ie-community-joined-platforms': '[]' })).toBe('show')
    expect(runBoot('/', { 'ie-community-joined-platforms': 'not-json' })).toBe('show')
  })

  it('honours the 14-day dismissal window', () => {
    expect(runBoot('/', { 'ie-community-banner-dismissed-at': String(Date.now() - DAY) })).toBeNull()
    expect(runBoot('/', { 'ie-community-banner-dismissed-at': String(Date.now() - 15 * DAY) })).toBe('show')
    expect(runBoot('/', { 'ie-community-banner-dismissed-at': 'garbage' })).toBeNull()
  })

  it('never reserves when storage is unavailable', () => {
    expect(runBoot('/', {}, true)).toBeNull()
  })
})
