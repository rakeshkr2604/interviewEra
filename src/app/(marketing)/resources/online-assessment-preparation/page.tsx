import type { Metadata } from 'next'
import { AssessmentPrepArticle } from '@/components/prep/AssessmentPrepArticle'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { prepGuideMetadata, prepGuideStructuredData } from '@/lib/prep/guide-metadata'
import '../../blog/blog.css'

export const metadata: Metadata = prepGuideMetadata('assessment')
export const revalidate = 3600

export default function OnlineAssessmentPreparationPage() {
  const structured = prepGuideStructuredData('assessment')
  return (
    <>
      {structured.article ? <JsonLdScript id="prep-assessment-article-ld" data={structured.article} /> : null}
      <JsonLdScript id="prep-assessment-breadcrumb-ld" data={structured.breadcrumb} />
      <AssessmentPrepArticle />
    </>
  )
}
