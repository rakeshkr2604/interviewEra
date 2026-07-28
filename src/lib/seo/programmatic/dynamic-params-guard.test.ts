import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Catalog routes under (marketing)/ share a loading.tsx that streams early.
 * With default dynamicParams=true, unknown slugs call notFound() inside that
 * stream and Next locks HTTP 200 (soft 404). These pages must opt out.
 *
 * Manual status check after `npm run build && npm start`:
 *   curl -sI http://localhost:3000/interview-questions/topics/sqlSQL
 *   curl -sI http://localhost:3000/interview-questions/companies/not-a-company
 *   curl -sI http://localhost:3000/interview-questions/not-a-role
 *   curl -sI http://localhost:3000/interview-questions/companies/amazon/not-a-role
 * Expect: HTTP/1.1 404
 */
const CATALOG_DYNAMIC_PAGES = [
  'src/app/(marketing)/interview-questions/topics/[skill]/page.tsx',
  'src/app/(marketing)/interview-questions/companies/[company]/page.tsx',
  'src/app/(marketing)/interview-questions/companies/[company]/[role]/page.tsx',
  'src/app/(marketing)/interview-questions/[role]/page.tsx',
  'src/app/(marketing)/tools/question-generator/[role]/page.tsx',
  'src/app/(marketing)/tools/question-generator/companies/[company]/page.tsx',
  'src/app/(marketing)/tools/ats-checker/[role]/page.tsx',
  'src/app/(marketing)/tools/star-builder/[topic]/page.tsx',
] as const

describe('catalog dynamicParams guard', () => {
  it.each(CATALOG_DYNAMIC_PAGES)('%s exports dynamicParams = false', (relPath) => {
    const src = readFileSync(join(process.cwd(), relPath), 'utf8')
    expect(src).toMatch(/export const dynamicParams\s*=\s*false/)
  })
})
