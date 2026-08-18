/**
 * GET /api/pricing/public — list + live global campaign prices.
 * No admin fields. Amounts are server-calculated.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getPublicPricingSnapshot } from '@/lib/pricing/effective-price';

export async function GET(): Promise<NextResponse> {
  try {
    const snapshot = await getPublicPricingSnapshot(createServiceClient());
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[pricing/public] snapshot failed', error);
    return NextResponse.json({ error: 'Pricing unavailable' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
