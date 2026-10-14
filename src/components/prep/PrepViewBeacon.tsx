'use client'

import { useEffect } from 'react'
import { trackPrepViewOnce, type PrepEventProps } from '@/lib/prep/analytics'

export function PrepViewBeacon({
  event,
  pagePath,
}: {
  event: 'resource_hub_viewed' | 'prep_guide_opened'
  pagePath: NonNullable<PrepEventProps['page_path']>
}) {
  useEffect(() => {
    trackPrepViewOnce(event, pagePath)
  }, [event, pagePath])

  return null
}
