import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { BRAND_COLORS } from '@/lib/brand/assets'

export async function GET() {
  const iconPath = path.join(
    process.cwd(),
    'public',
    'brand',
    'icons',
    'ui',
    'interviewera-icon-square.png',
  )
  const iconData = await readFile(iconPath)
  const iconSrc = `data:image/png;base64,${iconData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, #ffffff 0%, #f5f3ff 45%, #ede9fe 100%)`,
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 50% 40% at 90% 10%, ${BRAND_COLORS.secondaryViolet}2e, transparent 60%), radial-gradient(ellipse 60% 50% at 10% 90%, ${BRAND_COLORS.primaryPurple}26, transparent 60%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* ImageResponse/Satori only supports native <img>, not next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconSrc}
            width={56}
            height={56}
            alt=""
            style={{ width: 56, height: 56, borderRadius: 14 }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: BRAND_COLORS.deepNavy,
              letterSpacing: '-0.01em',
            }}
          >
            InterviewEra
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: BRAND_COLORS.deepNavy,
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Know your score</span>
            <span>before the company</span>
            <span
              style={{
                background: `linear-gradient(90deg, ${BRAND_COLORS.primaryPurple}, ${BRAND_COLORS.secondaryViolet})`,
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              decides for you.
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 32,
            borderTop: `1px solid ${BRAND_COLORS.deepNavy}14`,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: BRAND_COLORS.neutralGray,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>Upload resume</span>
            <span style={{ color: BRAND_COLORS.secondaryViolet }}>→</span>
            <span>Answer AI</span>
            <span style={{ color: BRAND_COLORS.secondaryViolet }}>→</span>
            <span>Get scored</span>
          </div>
          <div
            style={{
              fontSize: 22,
              color: BRAND_COLORS.primaryPurple,
              fontWeight: 600,
            }}
          >
            interviewera.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
