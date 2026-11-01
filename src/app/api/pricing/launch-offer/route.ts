/**
 * GET /api/pricing/launch-offer — read-only public view of the live launch offer.
 *
 * Used by the homepage pricing preview, which is ISR-cached and so cannot render
 * the offer itself without risking a stale discount. Reuses `loadLaunchOffer`
 * (same display rules as /pricing); never reserves or consumes a redemption.
 * Returns `{ offer: null }` whenever no live, dated, non-exhausted campaign exists.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { loadLaunchOffer } from '@/lib/pricing/launch-offer';
import { isSupabasePlaceholderCredential } from '@/lib/analytics/product-events-store';
import type { PaidPlanId } from '@/lib/pricing/plans';

export type PublicLaunchOffer = {
  code: string;
  discountPercent: number | null;
  plans: Partial<Record<PaidPlanId, { listPaise: number; finalPaise: number }>>;
  expiresAt: string | null;
};

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60' };

export async function GET(): Promise<NextResponse> {
  // E2E / CI placeholder credentials: never advertise an offer that was not loaded from a real DB.
  if (
    isSupabasePlaceholderCredential(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    )
  ) {
    return NextResponse.json({ offer: null }, { headers: CACHE_HEADERS });
  }

  try {
    const offer = await loadLaunchOffer(createServiceClient());
    const body: { offer: PublicLaunchOffer | null } = {
      offer: offer
        ? {
            code: offer.code,
            discountPercent: offer.discountPercent,
            plans: offer.plans,
            expiresAt: offer.expiresAt,
          }
        : null,
    };
    return NextResponse.json(body, { headers: CACHE_HEADERS });
  } catch (error) {
    console.warn('[pricing/launch-offer] unavailable; showing list prices', error);
    return NextResponse.json({ offer: null }, { headers: CACHE_HEADERS });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
