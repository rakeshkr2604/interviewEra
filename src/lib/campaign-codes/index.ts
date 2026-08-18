/**
 * Campaign code (promo / sponsorship) discount helpers — service-role RPCs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaidPlanId } from '@/lib/pricing/plans';

export type CampaignCodeKind = 'promo' | 'sponsorship';
export type CampaignDiscountType = 'percent' | 'flat_paise';

/** Exact column order returned by quote_campaign_discount in the latest migration. */
export const CAMPAIGN_QUOTE_RPC_COLUMNS = [
  'ok',
  'error_code',
  'campaign_code_id',
  'discount_paise',
  'final_amount_paise',
  'label',
  'kind',
  'discount_type',
  'discount_value',
  'starts_at',
  'expires_at',
  'is_active',
  'server_now',
] as const;

export type CampaignDiscountErrorCode =
  | 'CODE_INVALID'
  | 'CODE_NOT_STARTED'
  | 'CODE_EXPIRED'
  | 'CODE_EXHAUSTED'
  | 'CODE_NOT_APPLICABLE'
  | 'CODE_ALREADY_USED'
  | 'CODE_BELOW_MINIMUM'
  | 'CODE_DISCOUNT_INVALID'
  | 'CHECKOUT_INITIALIZING';

export const CAMPAIGN_DISCOUNT_USER_MESSAGES: Record<CampaignDiscountErrorCode, string> = {
  CODE_INVALID: 'This code is not valid.',
  CODE_NOT_STARTED: 'This campaign has not started yet.',
  CODE_EXPIRED: 'This code has expired.',
  CODE_EXHAUSTED: 'This code has reached its usage limit.',
  CODE_NOT_APPLICABLE: 'This code cannot be applied to the selected plan.',
  CODE_ALREADY_USED: 'You have already redeemed this code on a completed payment.',
  CODE_BELOW_MINIMUM:
    'This code would reduce the price below the promotional minimum for this plan.',
  CODE_DISCOUNT_INVALID: 'This campaign discount is invalid or exceeds 50%.',
  CHECKOUT_INITIALIZING: 'Your checkout is still initializing. Please try again in a moment.',
};

/** Absolute Razorpay floor; plan-specific promotional floors are higher. */
export const MIN_CHECKOUT_PAISE = 100;
export const MAX_CAMPAIGN_DISCOUNT_PERCENT = 50;

export function campaignWindowStatus(
  startsAt: Date | null,
  expiresAt: Date | null,
  now: Date,
): 'not_started' | 'active' | 'expired' {
  if (startsAt && startsAt.getTime() > now.getTime()) return 'not_started';
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'active';
}

export function campaignAppliesToPlan(
  appliesToPlans: readonly PaidPlanId[],
  plan: PaidPlanId,
): boolean {
  return appliesToPlans.length === 0 || appliesToPlans.includes(plan);
}

/**
 * Campaign percentage rounding policy: nearest whole rupee, with an exact
 * half-rupee rounded down. This produces deterministic advertised prices:
 * ₹299 @ 30% = ₹209, ₹299 @ 50% = ₹149, ₹799 @ 30% = ₹559.
 */
export function calculatePercentFinalAmountPaise(
  listAmountPaise: number,
  discountPercent: number,
): number {
  if (!Number.isSafeInteger(listAmountPaise) || !Number.isSafeInteger(discountPercent)) {
    throw new TypeError('Campaign money and percentage values must be safe integers.');
  }

  const weightedPaise = listAmountPaise * (100 - discountPercent);
  if (!Number.isSafeInteger(weightedPaise)) {
    throw new RangeError('Campaign calculation exceeds safe integer range.');
  }

  const wholeRupees = Math.floor(weightedPaise / 10_000);
  const remainder = weightedPaise % 10_000;
  return (wholeRupees + (remainder > 5_000 ? 1 : 0)) * 100;
}

/**
 * Pure discount math mirroring quote_campaign_discount (for unit tests / Test Quote UI).
 * Returns rejection — never clamps below MIN_CHECKOUT_PAISE.
 */
export function computeCampaignDiscountQuote(params: {
  listAmountPaise: number;
  promoFloorPaise: number;
  discountType: CampaignDiscountType;
  discountValue: number;
}):
  | { ok: true; discount_paise: number; final_amount_paise: number }
  | {
      ok: false;
      error_code: 'CODE_BELOW_MINIMUM' | 'CODE_DISCOUNT_INVALID';
    } {
  const { listAmountPaise, promoFloorPaise, discountType, discountValue } = params;
  if (
    !Number.isSafeInteger(listAmountPaise) ||
    !Number.isSafeInteger(promoFloorPaise) ||
    !Number.isSafeInteger(discountValue) ||
    listAmountPaise < 0 ||
    promoFloorPaise < MIN_CHECKOUT_PAISE ||
    promoFloorPaise > listAmountPaise ||
    discountValue < 0
  ) {
    return { ok: false, error_code: 'CODE_DISCOUNT_INVALID' };
  }

  let finalAmountPaise: number;
  if (discountType === 'percent') {
    if (discountValue > MAX_CAMPAIGN_DISCOUNT_PERCENT) {
      return { ok: false, error_code: 'CODE_DISCOUNT_INVALID' };
    }
    finalAmountPaise = calculatePercentFinalAmountPaise(listAmountPaise, discountValue);
  } else {
    if (discountValue * 100 > listAmountPaise * MAX_CAMPAIGN_DISCOUNT_PERCENT) {
      return { ok: false, error_code: 'CODE_DISCOUNT_INVALID' };
    }
    finalAmountPaise = listAmountPaise - discountValue;
  }

  if (
    finalAmountPaise < MIN_CHECKOUT_PAISE ||
    finalAmountPaise < promoFloorPaise ||
    finalAmountPaise > listAmountPaise
  ) {
    return { ok: false, error_code: 'CODE_BELOW_MINIMUM' };
  }

  return {
    ok: true,
    discount_paise: listAmountPaise - finalAmountPaise,
    final_amount_paise: finalAmountPaise,
  };
}

export interface QuoteCampaignDiscountResult {
  ok: boolean;
  error_code: CampaignDiscountErrorCode | null;
  campaign_code_id: string | null;
  discount_paise: number;
  final_amount_paise: number;
  label: string | null;
  kind: CampaignCodeKind | null;
  discount_type: CampaignDiscountType | null;
  discount_value: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  server_now: string | null;
}

export interface ReserveCampaignCodeResult extends QuoteCampaignDiscountResult {
  redemption_id: string | null;
  reservation_created: boolean;
  order_id: string | null;
}

type RpcQuoteRow = {
  ok: boolean;
  error_code: string | null;
  campaign_code_id: string | null;
  discount_paise: number;
  final_amount_paise: number;
  label: string | null;
  kind: string | null;
  discount_type: string | null;
  discount_value: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  server_now: string | null;
};

type RpcReserveRow = RpcQuoteRow & {
  redemption_id: string | null;
  reservation_created: boolean | null;
  order_id: string | null;
};

function mapQuote(row: RpcQuoteRow | null | undefined, listAmount: number): QuoteCampaignDiscountResult {
  if (!row) {
    return {
      ok: false,
      error_code: 'CODE_INVALID',
      campaign_code_id: null,
      discount_paise: 0,
      final_amount_paise: listAmount,
      label: null,
      kind: null,
      discount_type: null,
      discount_value: null,
      starts_at: null,
      expires_at: null,
      is_active: false,
      server_now: null,
    };
  }
  return {
    ok: Boolean(row.ok),
    error_code: (row.error_code as CampaignDiscountErrorCode | null) ?? null,
    campaign_code_id: row.campaign_code_id,
    discount_paise: Number(row.discount_paise) || 0,
    final_amount_paise: Number(row.final_amount_paise) || listAmount,
    label: row.label,
    kind: (row.kind as CampaignCodeKind | null) ?? null,
    discount_type: (row.discount_type as CampaignDiscountType | null) ?? null,
    discount_value:
      row.discount_value == null || !Number.isFinite(Number(row.discount_value))
        ? null
        : Number(row.discount_value),
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    is_active: Boolean(row.is_active),
    server_now: row.server_now,
  };
}

export async function quoteCampaignDiscount(
  svc: SupabaseClient,
  params: {
    code: string;
    plan: PaidPlanId;
    listAmountPaise: number;
    promoFloorPaise: number;
  },
): Promise<QuoteCampaignDiscountResult> {
  const { data, error } = await svc.rpc('quote_campaign_discount', {
    p_code: params.code,
    p_plan: params.plan,
    p_list_amount_paise: params.listAmountPaise,
    p_promo_floor_paise: params.promoFloorPaise,
  });
  if (error) {
    console.error('[campaign-codes] quote failed:', error.message);
    return mapQuote(null, params.listAmountPaise);
  }
  const row = Array.isArray(data) ? (data[0] as RpcQuoteRow | undefined) : (data as RpcQuoteRow);
  return mapQuote(row, params.listAmountPaise);
}

export async function reserveCampaignCode(
  svc: SupabaseClient,
  params: {
    userId: string;
    code: string;
    plan: PaidPlanId;
    listAmountPaise: number;
    promoFloorPaise: number;
    orderId?: string | null;
  },
): Promise<ReserveCampaignCodeResult> {
  const { data, error } = await svc.rpc('reserve_campaign_code', {
    p_user_id: params.userId,
    p_code: params.code,
    p_plan: params.plan,
    p_list_amount_paise: params.listAmountPaise,
    p_promo_floor_paise: params.promoFloorPaise,
    p_order_id: params.orderId ?? null,
  });
  if (error) {
    console.error('[campaign-codes] reserve failed:', error.message);
    return {
      ...mapQuote(null, params.listAmountPaise),
      redemption_id: null,
      reservation_created: false,
      order_id: null,
    };
  }
  const row = Array.isArray(data) ? (data[0] as RpcReserveRow | undefined) : (data as RpcReserveRow);
  return {
    ...mapQuote(row, params.listAmountPaise),
    redemption_id: row?.redemption_id ?? null,
    reservation_created: Boolean(row?.reservation_created),
    order_id: row?.order_id ?? null,
  };
}

/**
 * Atomically attach a Razorpay order and its local payment row to the exact
 * reservation that authorized the discounted amount.
 */
export async function attachCampaignOrder(
  svc: SupabaseClient,
  params: {
    redemptionId: string;
    userId: string;
    orderId: string;
    currency: string;
    gateway?: string;
  },
): Promise<boolean> {
  const { data, error } = await svc.rpc('attach_campaign_order', {
    p_redemption_id: params.redemptionId,
    p_user_id: params.userId,
    p_order_id: params.orderId,
    p_currency: params.currency,
    p_gateway: params.gateway ?? 'razorpay',
  });
  if (error) {
    console.error('[campaign-codes] attach order failed:', error.message, {
      redemptionId: params.redemptionId,
      orderId: params.orderId,
      code: error.code,
    });
    return false;
  }
  return data === true;
}

export async function releaseCampaignReservation(
  svc: SupabaseClient,
  redemptionId: string,
): Promise<boolean> {
  const { data, error } = await svc.rpc('release_campaign_reservation', {
    p_redemption_id: redemptionId,
  });
  if (error) {
    console.error('[campaign-codes] release failed:', error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Release a reserved campaign redemption linked to a Razorpay order.
 * Uses atomic release_campaign_reservation RPC (no-op if already released/consumed).
 */
export async function releaseCampaignReservationForOrder(
  svc: SupabaseClient,
  orderId: string,
): Promise<{ released: boolean; redemptionId: string | null }> {
  const { data: payment, error: payErr } = await svc
    .from('payments')
    .select('campaign_redemption_id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (payErr) {
    console.error('[campaign-codes] order lookup failed:', payErr.message);
    return { released: false, redemptionId: null };
  }

  let redemptionId = (payment?.campaign_redemption_id as string | null) ?? null;

  if (!redemptionId) {
    const { data: row, error: redErr } = await svc
      .from('campaign_code_redemptions')
      .select('id')
      .eq('order_id', orderId)
      .eq('status', 'reserved')
      .maybeSingle();
    if (redErr) {
      console.error('[campaign-codes] redemption lookup failed:', redErr.message);
      return { released: false, redemptionId: null };
    }
    redemptionId = (row?.id as string | null) ?? null;
  }

  if (!redemptionId) {
    return { released: false, redemptionId: null };
  }

  const released = await releaseCampaignReservation(svc, redemptionId);
  return { released, redemptionId };
}

/**
 * Batch-release abandoned checkout reservations older than `olderThanMinutes`.
 * Decrements campaign_codes.redemption_count via release_campaign_reservation per row.
 */
export async function releaseStaleCampaignReservations(
  svc: SupabaseClient,
  olderThanMinutes = 30,
): Promise<number> {
  const { data, error } = await svc.rpc('release_stale_campaign_reservations', {
    p_older_than_minutes: olderThanMinutes,
  });
  if (error) {
    throw new Error(`release_stale_campaign_reservations failed: ${error.message}`);
  }
  const row = Array.isArray(data)
    ? (data[0] as { released_count: number } | undefined)
    : (data as { released_count: number } | null);
  return Number(row?.released_count) || 0;
}

export async function consumeCampaignRedemption(
  svc: SupabaseClient,
  params: { redemptionId: string; orderId: string; paymentId: string },
): Promise<{ ok: boolean; error?: string; rpcData?: unknown }> {
  const { data, error } = await svc.rpc('consume_campaign_redemption', {
    p_redemption_id: params.redemptionId,
    p_order_id: params.orderId,
    p_payment_id: params.paymentId,
  });
  if (error) {
    console.error('[campaign-codes] consume failed:', error.message, {
      redemptionId: params.redemptionId,
      orderId: params.orderId,
      paymentId: params.paymentId,
      code: error.code,
    });
    return { ok: false, error: error.message, rpcData: data };
  }
  // Scalar BOOLEAN RPCs must return JSON `true`. Anything else is a failed consume.
  if (data === true) {
    return { ok: true, rpcData: data };
  }
  return {
    ok: false,
    error: `consume_campaign_redemption returned non-true: ${JSON.stringify(data)}`,
    rpcData: data,
  };
}

export function normalizeCampaignCode(raw: string): string {
  return raw.trim().toUpperCase();
}
