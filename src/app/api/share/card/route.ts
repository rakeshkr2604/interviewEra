import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const score = parseFloat(searchParams.get('score') ?? '0');
  const role = searchParams.get('role') ?? 'Interview';

  const scoreDisplay = isNaN(score) ? '—' : score.toFixed(1);
  const scoreColor =
    score >= 7 ? '#16a34a' : score >= 5 ? '#ca8a04' : '#dc2626';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'interviewera.com';

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: '80px',
        },
      },
      // Brand
      React.createElement(
        'div',
        { style: { fontSize: 32, fontWeight: 700, opacity: 0.9, marginBottom: 40 } },
        'InterviewEra',
      ),
      // Score box
      React.createElement(
        'div',
        {
          style: {
            fontSize: 140,
            fontWeight: 800,
            lineHeight: 1,
            color: scoreColor,
            background: 'white',
            borderRadius: 32,
            padding: '20px 60px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
          },
        },
        scoreDisplay,
        React.createElement(
          'span',
          { style: { fontSize: 56, fontWeight: 400, color: '#6b7280' } },
          '/10',
        ),
      ),
      // Role
      React.createElement(
        'div',
        { style: { fontSize: 44, fontWeight: 600, opacity: 0.95, marginBottom: 12, textAlign: 'center' } },
        role,
      ),
      React.createElement(
        'div',
        { style: { fontSize: 28, opacity: 0.7, marginBottom: 80 } },
        'Mock Interview Score',
      ),
      // CTA
      React.createElement(
        'div',
        {
          style: {
            fontSize: 26,
            opacity: 0.85,
            textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.3)',
            paddingTop: 40,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          },
        },
        'Can you beat my score?',
        React.createElement('span', { style: { fontWeight: 700 } }, appUrl),
      ),
    ),
    {
      width: 1080,
      height: 1080,
      headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
    },
  );
}
