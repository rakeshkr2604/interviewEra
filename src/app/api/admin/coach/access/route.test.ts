import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

let mockAdminError: NextResponse | null = null
const mockAdmin = { id: 'admin-1', email: 'rakesh.kr2604@gmail.com' }

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: vi.fn(async () => {
    if (mockAdminError) {
      return { admin: null, error: mockAdminError }
    }
    return { admin: mockAdmin, error: null }
  }),
}))

let mockMode = 'disabled'
let mockAllowlist: string[] = []

vi.mock('@/lib/coach/access', () => ({
  COACH_ACCESS_MODES: ['disabled', 'admin_only', 'allowlist', 'public'] as const,
  getCoachAccessMode: vi.fn(async () => mockMode),
  setCoachAccessMode: vi.fn(async (m: string) => {
    mockMode = m
  }),
  getCoachAllowlist: vi.fn(async () => mockAllowlist),
  addEmailsToCoachAllowlist: vi.fn(async (emails: string[]) => {
    const toAdd = emails.map((e) => e.trim().toLowerCase())
    for (const e of toAdd) {
      if (!mockAllowlist.includes(e)) mockAllowlist.push(e)
    }
    return toAdd.length
  }),
  removeEmailsFromCoachAllowlist: vi.fn(async (emails: string[]) => {
    const toRemove = new Set(emails.map((e) => e.trim().toLowerCase()))
    const before = mockAllowlist.length
    mockAllowlist = mockAllowlist.filter((e) => !toRemove.has(e))
    return before - mockAllowlist.length
  }),
  clearCoachAllowlist: vi.fn(async () => {
    mockAllowlist = []
  }),
}))

import { GET, POST } from './route'

describe('GET/POST /api/admin/coach/access', () => {
  beforeEach(() => {
    mockAdminError = null
    mockMode = 'disabled'
    mockAllowlist = []
    vi.clearAllMocks()
  })

  describe('authorization', () => {
    it('returns 401 when unauthenticated (no session)', async () => {
      mockAdminError = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const getRes = await GET()
      expect(getRes.status).toBe(401)

      const postReq = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: 'public' }),
      })
      const postRes = await POST(postReq)
      expect(postRes.status).toBe(401)
    })

    it('returns 403 when authenticated but not platform admin', async () => {
      mockAdminError = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const getRes = await GET()
      expect(getRes.status).toBe(403)

      const postReq = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: 'public' }),
      })
      const postRes = await POST(postReq)
      expect(postRes.status).toBe(403)
    })
  })

  describe('GET', () => {
    it('returns current mode and allowlist', async () => {
      mockMode = 'allowlist'
      mockAllowlist = ['user1@example.com', 'user2@example.com']

      const res = await GET()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({
        mode: 'allowlist',
        allowlistCount: 2,
        allowlist: ['user1@example.com', 'user2@example.com'],
      })
    })
  })

  describe('POST actions', () => {
    it('handles set_mode', async () => {
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: 'admin_only' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(data.mode).toBe('admin_only')
      expect(mockMode).toBe('admin_only')
    })

    it('rejects invalid mode', async () => {
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: 'invalid_mode' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('handles add_emails', async () => {
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_emails',
          emails: ['tester1@example.com', 'tester2@example.com'],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(data.added).toBe(2)
      expect(mockAllowlist).toContain('tester1@example.com')
      expect(mockAllowlist).toContain('tester2@example.com')
    })

    it('handles remove_emails', async () => {
      mockAllowlist = ['keep@example.com', 'remove@example.com']
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_emails',
          emails: ['remove@example.com'],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(data.removed).toBe(1)
      expect(mockAllowlist).toEqual(['keep@example.com'])
    })

    it('handles clear_allowlist', async () => {
      mockAllowlist = ['tester1@example.com', 'tester2@example.com']
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_allowlist' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(data.allowlist).toEqual([])
      expect(mockAllowlist).toEqual([])
    })

    it('rejects malformed emails (non-email strings) in add_emails', async () => {
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_emails',
          emails: ['not-an-email', 'also bad', '@@double'],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('rejects malformed emails in remove_emails', async () => {
      const req = new Request('http://localhost/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_emails',
          emails: ['not-an-email'],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })
})
