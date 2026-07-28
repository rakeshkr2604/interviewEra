import { describe, expect, it } from 'vitest'
import { generateMetadata } from '@/lib/seo/metadata'
import { canonicalUrl } from '@/lib/seo/site-url'
import { isValidSeoPath } from '@/lib/seo/url-safety'

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
