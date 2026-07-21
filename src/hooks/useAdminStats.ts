'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlatformStats } from '@/app/api/admin/stats/route';
import type { InterviewStats } from '@/app/api/admin/interviews/route';
import type { LiveUser } from '@/app/api/admin/live-users/route';
import type { RecentUser, RecentUsersRange } from '@/app/api/admin/recent-users/route';

export type { PlatformStats, InterviewStats, LiveUser, RecentUser, RecentUsersRange };

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  const [stats, setStats]             = useState<PlatformStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inflightRef = useRef(false);

  const fetch_ = useCallback(async (fresh = false) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const url  = fresh ? '/api/admin/stats?fresh=1' : '/api/admin/stats';
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as PlatformStats;
      setStats(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, []);

  // Initial mount uses cache. Manual refresh always passes fresh=true.
  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { stats, loading, error, refresh, lastUpdated };
}

// ── Interview chart data ───────────────────────────────────────────────────────

export function useInterviewStats() {
  const [data, setData]       = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = fresh ? '/api/admin/interviews?fresh=1' : '/api/admin/interviews';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as InterviewStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { data, loading, error, refresh };
}

// ── Live users ─────────────────────────────────────────────────────────────────

export function useLiveUsers() {
  const [users, setUsers]     = useState<LiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = fresh ? '/api/admin/live-users?fresh=1' : '/api/admin/live-users';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { users: u } = await res.json() as { users: LiveUser[] };
      setUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { users, loading, error, refresh };
}

// ── Recent users (paginated) ───────────────────────────────────────────────────

export type UsersDateFilter =
  | { kind: 'preset'; range: RecentUsersRange }
  | { kind: 'custom'; from: string; to: string };

export function useRecentUsers(
  page = 1,
  limit = 20,
  refreshKey = 0,
  dateFilter: UsersDateFilter = { kind: 'preset', range: 'all' },
) {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (dateFilter.kind === 'custom') {
        params.set('from', dateFilter.from);
        params.set('to', dateFilter.to);
      } else {
        params.set('range', dateFilter.range);
      }
      if (fresh) params.set('fresh', '1');
      const res = await fetch(`/api/admin/recent-users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { users: RecentUser[]; total: number; total_pages: number };
      setUsers(body.users);
      setTotal(body.total);
      setTotalPages(body.total_pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [page, limit, dateFilter]);

  // refreshKey=0 → initial load (use cache). refreshKey>0 → manual refresh (bypass cache).
  useEffect(() => { void fetch_(refreshKey > 0); }, [fetch_, refreshKey]);

  return { users, total, totalPages, loading, error };
}

// ── System health ──────────────────────────────────────────────────────────────

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'offline';
  services: {
    database:     { status: string; latency_ms: number };
    redis:        { status: string; latency_ms: number };
    ai_providers: { status: string; routing_basis: string; total_cost_usd: number };
    elevenlabs:   { status: string; latency_ms?: number; reason?: string; quota_remaining_pct?: number };
  };
  checked_at: string;
}

export function useSystemHealth() {
  const [health, setHealth]   = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const url = fresh ? '/api/admin/system?fresh=1' : '/api/admin/system';
      const res = await fetch(url);
      if (!res.ok) return;
      setHealth(await res.json() as SystemHealth);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { health, loading, refresh };
}
