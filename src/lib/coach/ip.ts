import type { NextRequest } from 'next/server'

/** Client IP for coach rate limits (Vercel / proxy aware). */
export function getCoachClientIp(request: Request | NextRequest): string {
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}
