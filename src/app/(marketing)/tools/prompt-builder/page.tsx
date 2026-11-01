import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Sparkles } from 'lucide-react'
import { PromptBuilder } from '@/components/prep/PromptBuilder'
import { PrepMockCta } from '@/components/prep/PrepMockCta'
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, webApplicationJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'

export const metadata: Metadata = generateMetadata({
  title: 'ChatGPT prompt builder',
  description:
    'Build a ChatGPT interview-prep prompt from your target role. It stays in your browser. Resume text is optional and is not uploaded.',
  path: '/tools/prompt-builder',
})

const ORIGIN = getCanonicalSiteOrigin()

const WEBAPP_LD = webApplicationJsonLd({
  name: 'ChatGPT Interview Prompt Builder',
  description:
    'Create a local interview-preparation prompt for your own ChatGPT chat. Free with a registered InterviewEra account. No resume upload.',
  url: canonicalUrl('/tools/prompt-builder'),
  providerId: schemaIds.organization,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools/prompt-builder' },
    { name: 'Prompt Builder', path: '/tools/prompt-builder' },
  ],
  ORIGIN,
)

const BULLETS = [
  {
    icon: Shield,
    title: 'Built on this device',
    body: 'The prompt is written in your browser. InterviewEra does not receive your resume or the generated text.',
  },
  {
    icon: Sparkles,
    title: 'Paste it into your own chat',
    body: 'Copy the prompt into ChatGPT, then practise the spoken version in a mock interview.',
  },
] as const

export default function PromptBuilderToolPage() {
  return (
    <>
      <JsonLdScript id="prompt-builder-webapp-ld" data={WEBAPP_LD} />
      <JsonLdScript id="prompt-builder-breadcrumb-ld" data={BREADCRUMB_LD} />
      <FreeToolPageLayout
        eyebrow="Free tool · free account"
        eyebrowIcon={Sparkles}
        title="ChatGPT prompt builder"
        description="Turn a target role into a prompt you can paste into your own ChatGPT chat. A resume is optional."
        bullets={BULLETS}
        footerSlot={
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Read{' '}
            <Link href="/resources/chatgpt-interview-preparation" className="font-semibold underline-offset-4 hover:underline">
              how to use ChatGPT for interview preparation
            </Link>{' '}
            before you memorise anything the model writes.
          </p>
        }
        bottomSlot={
          <div className="flex justify-center lg:justify-start">
            <PrepMockCta mode="mixed" section="prompt_builder_tool" />
          </div>
        }
      >
        <PromptBuilder />
      </FreeToolPageLayout>
    </>
  )
}
