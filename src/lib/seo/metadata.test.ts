import { describe, expect, it } from 'vitest'
import { clampTitleSegment, generateMetadata, SEO_MAX_TITLE_SEGMENT } from './metadata'

describe('clampTitleSegment', () => {
  it('returns short titles unchanged', () => {
    expect(clampTitleSegment('Pricing')).toBe('Pricing')
  })

  it.each([
    ['Google Apprenticeship 2026: Eligibility, Salary, Last Date & India Guide', /Eligibility$/],
    ['Business Analyst Interview Questions and Answers for Freshers & Experienced (2026)', /Questions$/],
    ['Agentic AI Interview Round (2026): The Ultimate Guide to Cracking It', /\(2026\)$/],
    ['Solera Interview Questions (2026) – Hiring & Careers Hub For Everyone', /Hiring$/],
  ])('never ends on a dangling separator or connective: %s', (input, tail) => {
    const out = clampTitleSegment(input)
    expect(out.length).toBeLessThanOrEqual(SEO_MAX_TITLE_SEGMENT)
    expect(out).toMatch(tail)
    expect(out).not.toMatch(/[,:;&|(–—-]$|\s(and|the|for|of|to)$/i)
  })
})

describe('generateMetadata documentTitleAbsolute', () => {
  it('emits an absolute title that bypasses the brand template', () => {
    const meta = generateMetadata({
      title: 'Long segment',
      documentTitleAbsolute: 'Google Apprenticeship 2026: Eligibility, Salary & Last Date',
      description: 'd',
      path: '/google-apprenticeship',
    })
    expect(meta.title).toEqual({ absolute: 'Google Apprenticeship 2026: Eligibility, Salary & Last Date' })
  })
})
