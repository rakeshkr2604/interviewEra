'use client'

import { TrackedCtaLink } from '@/components/analytics/TrackedCta'
import { CTA_KEYS } from '@/lib/analytics/cta-keys'
import { trackPrepEvent } from '@/lib/prep/analytics'
import { focusedMockHref } from '@/lib/prep/guides'
import type { ScriptStartInterviewMode } from '@/lib/interview/script-start-query'
import {
  IE_MARKETING_CTA_PRIMARY_CLASS,
  IE_MARKETING_CTA_PRIMARY_STYLE,
} from '@/lib/theme/component-classes'
import { cn } from '@/lib/utils'

export function PrepMockCta({
  mode,
  section,
  className,
}: {
  mode?: ScriptStartInterviewMode
  section: string
  className?: string
}) {
  return (
    <TrackedCtaLink
      href={focusedMockHref(mode)}
      ctaKey={CTA_KEYS.START_MOCK_INTERVIEW}
      ctaText="Start a focused mock interview"
      section={section}
      className={cn(IE_MARKETING_CTA_PRIMARY_CLASS, className)}
      style={IE_MARKETING_CTA_PRIMARY_STYLE}
      onClick={() => {
        trackPrepEvent('prep_to_mock_cta_clicked', {
          section,
          mode: mode ?? 'unspecified',
        })
      }}
    >
      Start a focused mock interview
    </TrackedCtaLink>
  )
}
