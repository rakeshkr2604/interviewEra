import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 40%, #ede9fe 100%)',
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 50% 40% at 90% 10%, rgba(139, 92, 246, 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(99, 102, 241, 0.15), transparent 60%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            IE
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: '#4c1d95',
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
            zIndex: 1,
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#0f172a',
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
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
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
            zIndex: 1,
            paddingTop: 32,
            borderTop: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span>Upload resume</span>
            <span style={{ color: '#a78bfa' }}>→</span>
            <span>Answer AI</span>
            <span style={{ color: '#a78bfa' }}>→</span>
            <span>Get scored</span>
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#7c3aed',
              fontWeight: 600,
            }}
          >
            interviewera.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
