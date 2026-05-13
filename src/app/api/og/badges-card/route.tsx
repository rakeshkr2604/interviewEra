import { ImageResponse } from 'next/og'
import React from 'react'
import { BADGE_DISPLAY } from '@/lib/retention/badge-copy'
import { BADGE_THRESHOLDS } from '@/lib/retention/constants'
import { parseBadgeKeysFromShareParam } from '@/lib/retention/parse-share-badges'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const earned = parseBadgeKeysFromShareParam(searchParams.get('badges') ?? undefined)

  const origin = getCanonicalSiteOrigin()

  const lines =
    earned.length > 0
      ? earned.map((b) => BADGE_DISPLAY[b].title)
      : ['Quality streak badges on InterviewEra']

  const subtitle =
    earned.length > 0
      ? `${earned.length} earned · streak milestones from ${BADGE_THRESHOLDS.consistent_learner}–${BADGE_THRESHOLDS.placement_warrior} days`
      : 'Complete quality mock interviews on consecutive calendar days'

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 56,
          background: 'linear-gradient(145deg, #0f172a 0%, #312e81 48%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        },
      },
      React.createElement(
        'div',
        { style: { fontSize: 28, fontWeight: 700, opacity: 0.92, marginBottom: 28 } },
        'InterviewEra',
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: 54,
            fontWeight: 800,
            lineHeight: 1.12,
            marginBottom: 20,
          },
        },
        'My retention badges',
      ),
      React.createElement(
        'div',
        { style: { fontSize: 26, opacity: 0.88, marginBottom: 40, maxWidth: 900 } },
        subtitle,
      ),
      ...lines.slice(0, 4).map((line, i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: {
              fontSize: 34,
              fontWeight: 600,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            },
          },
          React.createElement('span', { style: { opacity: 0.55 } }, '▹'),
          line,
        ),
      ),
      React.createElement(
        'div',
        {
          style: {
            marginTop: 'auto',
            paddingTop: 36,
            borderTop: '1px solid rgba(248,250,252,0.22)',
            fontSize: 22,
            opacity: 0.78,
          },
        },
        origin.replace(/^https?:\/\//, ''),
      ),
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  )
}
