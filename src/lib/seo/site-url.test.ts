import { describe, expect, it } from 'vitest'
import { generateMetadata } from '@/lib/seo/metadata'
import { canonicalUrl, originFromRequestHost } from '@/lib/seo/site-url'
import { isValidSeoPath } from '@/lib/seo/url-safety'

describe('originFromRequestHost', () => {
  it('uses http for a bare localhost host with no forwarded proto', () => {
    expect(originFromRequestHost('localhost:3000', null)).toBe('http://localhost:3000')
  })

  it('uses http for 127.0.0.1 with no forwarded proto', () => {
    expect(originFromRequestHost('127.0.0.1:3000', undefined)).toBe('http://127.0.0.1:3000')
  })

  it('uses https for a real host with no forwarded proto', () => {
    expect(originFromRequestHost('interviewera.com', null)).toBe('https://interviewera.com')
  })

  it('prefers x-forwarded-proto when present, even for localhost', () => {
    expect(originFromRequestHost('localhost:3000', 'https')).toBe('https://localhost:3000')
  })

  it('prefers x-forwarded-proto for a staging/preview host', () => {
    expect(originFromRequestHost('preview-123.vercel.app', 'https')).toBe(
      'https://preview-123.vercel.app',
    )
  })

  it('returns null for a missing/empty host', () => {
    expect(originFromRequestHost(null, 'https')).toBeNull()
    expect(originFromRequestHost(undefined, 'https')).toBeNull()
    expect(originFromRequestHost('', 'https')).toBeNull()
  })
})

describe('SEO canonical URL safety', () => {
  it('rejects malformed single-segment canonical paths with null', () => {
    expect(canonicalUrl('$')).toBeNull()
    expect(canonicalUrl('&')).toBeNull()
    expect(canonicalUrl('10')).toBeNull()
  })

  it('keeps legitimate marketing and programmatic slugs valid', () => {
    expect(isValidSeoPath('/interview-questions/topics/mysql')).toBe(true)
    expect(isValidSeoPath('/interview-questions/companies/tech-mahindra')).toBe(true)
    expect(isValidSeoPath('/interview-questions/software-engineer')).toBe(true)
    expect(canonicalUrl('interview-questions/topics/mysql')).toBe(
      'https://interviewera.com/interview-questions/topics/mysql',
    )
  })

  it('omits canonical metadata instead of emitting a wrong fallback URL', () => {
    const metadata = generateMetadata({
      title: 'Broken page',
      description: 'Should not emit a malformed canonical URL.',
      path: '$',
    })

    expect(metadata.alternates?.canonical).toBeUndefined()
    expect(metadata.openGraph?.url).toBeUndefined()
  })
})
