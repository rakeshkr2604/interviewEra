/**
 * GET /api/admin/experiments — variant distribution + conversion by experiment.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { EXPERIMENT_VARIANTS, EXPERIMENTS } from '@/lib/analytics/experiments';

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  try {
    const svc = createServiceClient();
    const experiments = [];

    for (const key of Object.values(EXPERIMENTS)) {
      const variants = EXPERIMENT_VARIANTS[key];
      const variantStats = [];

      for (const variant of variants) {
        const { count: assigned } = await svc
          .from('experiment_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('experiment_key', key)
          .eq('variant', variant);

        const { data: users } = await svc
          .from('experiment_assignments')
          .select('user_id')
          .eq('experiment_key', key)
          .eq('variant', variant);

        const userIds = (users ?? []).map((u) => u.user_id as string);
        let completed = 0;
        if (userIds.length > 0) {
          const { count } = await svc
            .from('interviews')
            .select('user_id', { count: 'exact', head: true })
            .in('user_id', userIds)
            .eq('status', 'completed');
          completed = count ?? 0;
        }

        variantStats.push({
          variant,
          assigned: assigned ?? 0,
          completed_interviews: completed,
          conversion_pct:
            (assigned ?? 0) > 0
              ? Math.round(((completed ?? 0) / (assigned ?? 1)) * 1000) / 10
              : null,
        });
      }

      experiments.push({ key, variants: variantStats });
    }

    return NextResponse.json({ experiments, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[admin/experiments] Error:', err);
    return NextResponse.json({ error: 'Failed to load experiments' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
