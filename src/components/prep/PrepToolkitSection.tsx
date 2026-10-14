import Link from 'next/link'
import { ArrowRight, ClipboardCheck, MessagesSquare, MonitorSmartphone, Sparkles } from 'lucide-react'
import { PrepViewBeacon } from '@/components/prep/PrepViewBeacon'
import { ReadinessChecklist } from '@/components/prep/ReadinessChecklist'
import { MarketingSectionHeader } from '@/components/layout/MarketingSectionHeader'
import { PREP_GUIDES } from '@/lib/prep/guides'
import { FREE_PLAN } from '@/lib/pricing/plans'
import { IE_MARKETING_SURFACE_CARD_CLASS, IE_MARKETING_SURFACE_CARD_STYLE } from '@/lib/theme/component-classes'

const ENTRIES = [
  {
    href: '/tools/prompt-builder',
    title: 'Build Your Interview Preparation Prompt',
    description:
      'Create a ChatGPT prompt on this device from your target role. A resume is optional, and nothing is uploaded.',
    icon: Sparkles,
  },
  {
    href: PREP_GUIDES.hr.path,
    title: 'Learn How to Answer HR Questions',
    description:
      'Use a structure, a labelled example, and a self-review check for the questions HR rounds actually ask.',
    icon: MessagesSquare,
  },
  {
    href: PREP_GUIDES.assessment.path,
    title: 'Prepare for Online Assessments',
    description:
      'Set up for aptitude, coding, communication, and recorded video responses, and download the speaking sheets. The format depends on the drive.',
    icon: MonitorSmartphone,
  },
  {
    href: '#interview-readiness',
    title: 'Check Your Interview Readiness',
    description: 'Walk through a private checklist, then decide whether you are ready to start a spoken mock.',
    icon: ClipboardCheck,
  },
] as const

export function PrepToolkitSection() {
  return (
    <section aria-labelledby="prep-before-mock" className="scroll-mt-24">
      <PrepViewBeacon event="resource_hub_viewed" pagePath="/prepare" />
      <MarketingSectionHeader
        id="prep-before-mock"
        title="Prepare Before Your Mock Interview"
        subtitle="Build stronger answers, understand your target role, and prepare with free guides and practical tools before starting your next mock interview."
      />
      <p className="mb-5 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        These guides sit beside InterviewEra, not instead of it. A written prompt cannot hear you. New accounts
        include {FREE_PLAN.credits} free interview credits, and paid plans are listed on{' '}
        <Link href="/pricing" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
          pricing
        </Link>
        . See{' '}
        <Link href="/how-it-works" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
          how a mock interview works
        </Link>
        .
      </p>
      <ul className="mb-8 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon
          return (
            <li key={entry.href} className="min-w-0">
              <Link
                href={entry.href}
                className={`${IE_MARKETING_SURFACE_CARD_CLASS} flex h-full flex-col p-4 sm:p-5`}
                style={IE_MARKETING_SURFACE_CARD_STYLE}
              >
                <Icon className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                <span className="mt-3 text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {entry.title}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {entry.description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Open
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <ReadinessChecklist section="prepare_workspace" />
    </section>
  )
}
