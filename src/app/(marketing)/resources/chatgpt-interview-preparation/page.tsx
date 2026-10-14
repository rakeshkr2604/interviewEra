import type { Metadata } from 'next'
import { ChatGptPrepArticle } from '@/components/prep/ChatGptPrepArticle'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { prepGuideMetadata, prepGuideStructuredData } from '@/lib/prep/guide-metadata'
import '../../blog/blog.css'

export const metadata: Metadata = prepGuideMetadata('chatgpt')
export const revalidate = 3600

export default function ChatGptInterviewPreparationPage() {
  const structured = prepGuideStructuredData('chatgpt')
  return (
    <>
      {structured.article ? <JsonLdScript id="prep-chatgpt-article-ld" data={structured.article} /> : null}
      <JsonLdScript id="prep-chatgpt-breadcrumb-ld" data={structured.breadcrumb} />
      <ChatGptPrepArticle />
    </>
  )
}
