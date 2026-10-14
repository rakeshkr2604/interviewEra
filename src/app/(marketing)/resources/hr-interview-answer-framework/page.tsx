import type { Metadata } from 'next'
import { HrPrepArticle } from '@/components/prep/HrPrepArticle'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { prepGuideMetadata, prepGuideStructuredData } from '@/lib/prep/guide-metadata'
import '../../blog/blog.css'

export const metadata: Metadata = prepGuideMetadata('hr')
export const revalidate = 3600

export default function HrInterviewAnswerFrameworkPage() {
  const structured = prepGuideStructuredData('hr')
  return (
    <>
      {structured.article ? <JsonLdScript id="prep-hr-article-ld" data={structured.article} /> : null}
      <JsonLdScript id="prep-hr-breadcrumb-ld" data={structured.breadcrumb} />
      <HrPrepArticle />
    </>
  )
}
