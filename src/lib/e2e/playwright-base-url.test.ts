import { afterEach, describe, expect, it } from 'vitest'
import { resolvePlaywrightBaseUrl } from './playwright-base-url'

describe('resolvePlaywrightBaseUrl', () => {
  afterEach(() => {
    // no stubs — pure env object args
  })

  it('uses a valid PLAYWRIGHT_BASE_URL', () => {
    expect(
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3000/',
        NEXT_PUBLIC_APP_URL: 'http://example.invalid:9999',
      }),
    ).toBe('http://127.0.0.1:3000')
  })

  it('treats empty PLAYWRIGHT_BASE_URL as absent and falls back to NEXT_PUBLIC_APP_URL', () => {
    expect(
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: '',
        NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
      }),
    ).toBe('http://127.0.0.1:3000')
  })

  it('treats whitespace PLAYWRIGHT_BASE_URL as absent', () => {
    expect(
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: '   ',
        NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:4000',
      }),
    ).toBe('http://127.0.0.1:4000')
  })

  it('uses localhost fallback when both URLs are missing', () => {
    expect(resolvePlaywrightBaseUrl({})).toBe('http://localhost:3000')
  })

  it('respects PLAYWRIGHT_PORT on localhost fallback', () => {
    expect(
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: '',
        NEXT_PUBLIC_APP_URL: '',
        PLAYWRIGHT_PORT: '3010',
      }),
    ).toBe('http://localhost:3010')
  })

  it('throws an actionable error for an invalid PLAYWRIGHT_BASE_URL', () => {
    expect(() =>
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: 'not-a-url',
      }),
    ).toThrow(/\[e2e-base-url\] Invalid PLAYWRIGHT_BASE_URL/)
  })

  it('throws when NEXT_PUBLIC_APP_URL is invalid after empty PLAYWRIGHT_BASE_URL', () => {
    expect(() =>
      resolvePlaywrightBaseUrl({
        PLAYWRIGHT_BASE_URL: '',
        NEXT_PUBLIC_APP_URL: 'ftp://bad.example',
      }),
    ).toThrow(/\[e2e-base-url\] Invalid NEXT_PUBLIC_APP_URL/)
  })
})
