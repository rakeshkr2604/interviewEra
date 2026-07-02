'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FunnelMetricsResult } from '@/lib/admin/funnel-metrics';
import type { GrowthMetricsResult } from '@/lib/admin/growth-metrics';

export function useAdminFunnel(rangeDays = 30) {
  const [data, setData] = useState<FunnelMetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const q = fresh ? '&fresh=1' : '';
      const res = await fetch(`/api/admin/funnel?range=${rangeDays}${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as FunnelMetricsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { data, loading, error, refresh };
}

export function useAdminGrowth(rangeDays = 30) {
  const [data, setData] = useState<GrowthMetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const q = fresh ? '&fresh=1' : '';
      const res = await fetch(`/api/admin/growth?range=${rangeDays}${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as GrowthMetricsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { data, loading, error, refresh };
}

interface ExperimentVariantStat {
  variant: string;
  assigned: number;
  completed_interviews: number;
  conversion_pct: number | null;
}

export function useAdminExperiments() {
  const [experiments, setExperiments] = useState<
    { key: string; variants: ExperimentVariantStat[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/experiments');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { experiments: typeof experiments };
      setExperiments(json.experiments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch_(); }, [fetch_]);

  return { experiments, loading, error, refresh: fetch_ };
}
