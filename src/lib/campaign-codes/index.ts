/**
 * Campaign code (promo / sponsorship) discount helpers — service-role RPCs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaidPlanId } from '@/lib/pricing/plans';

export type CampaignCodeKind = 'promo' | 'sponsorship';
export type CampaignDiscountType = 'percent' | 'flat_paise';

export type CampaignDiscountErrorCode =
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'CODE_EXHAUSTED'
  | 'CODE_NOT_APPLICABLE'
  | 'CODE_ALREADY_USED'
  | 'CODE_BELOW_MINIMUM';

export const CAMPAIGN_DISCOUNT_USER_MESSAGES: Record<CampaignDiscountErrorCode, string> = {
  CODE_INVALID: 'This code is not valid.',
  CODE_EXPIRED: 'This code has expired.',
  CODE_EXHAUSTED: 'This code has reached its usage limit.',
  CODE_NOT_APPLICABLE: 'This code cannot be applied to the selected plan.',
  CODE_ALREADY_USED: 'You have already redeemed this code on a completed payment.',
  CODE_BELOW_MINIMUM:
    'This code would reduce the price below the minimum charge (₹1). Choose another plan or code.',
};

/** Razorpay floor — must match quote_campaign_discount SQL (`v_final < 100`). */
export const MIN_CHECKOUT_PAISE = 100;

/**
 * Pure discount math mirroring quote_campaign_discount (for unit tests / Test Quote UI).
 * Returns rejection — never clamps below MIN_CHECKOUT_PAISE.
 */
export function computeCampaignDiscountQuote(params: {
  listAmountPaise: number;
  discountType: CampaignDiscountType;
  discountValue: number;
}):
  | { ok: true; discount_paise: number; final_amount_paise: number }
  | { ok: false; error_code: 'CODE_BELOW_MINIMUM' } {
  const { listAmountPaise, discountType, discountValue } = params;
  const discountPaise =
    discountType === 'percent'
      ? Math.floor((listAmountPaise * discountValue) / 100)
      : discountValue;

  if (discountPaise >= listAmountPaise) {
    return { ok: false, error_code: 'CODE_BELOW_MINIMUM' };
  }

  const finalAmountPaise = listAmountPaise - discountPaise;
  if (finalAmountPaise < MIN_CHECKOUT_PAISE) {
    return { ok: false, error_code: 'CODE_BELOW_MINIMUM' };
  }

  return {
    ok: true,
    discount_paise: discountPaise,
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
}

export interface ReserveCampaignCodeResult extends QuoteCampaignDiscountResult {
  redemption_id: string | null;
}

type RpcQuoteRow = {
  ok: boolean;
  error_code: string | null;
  campaign_code_id: string | null;
  discount_paise: number;
  final_amount_paise: number;
  label: string | null;
  kind: string | null;
};

type RpcReserveRow = RpcQuoteRow & { redemption_id: string | null };

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
  };
}

export async function quoteCampaignDiscount(
  svc: SupabaseClient,
  params: { code: string; plan: PaidPlanId; listAmountPaise: number },
): Promise<QuoteCampaignDiscountResult> {
  const { data, error } = await svc.rpc('quote_campaign_discount', {
    p_code: params.code,
    p_plan: params.plan,
    p_list_amount_paise: params.listAmountPaise,
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
    orderId?: string | null;
  },
): Promise<ReserveCampaignCodeResult> {
  const { data, error } = await svc.rpc('reserve_campaign_code', {
    p_user_id: params.userId,
    p_code: params.code,
    p_plan: params.plan,
    p_list_amount_paise: params.listAmountPaise,
    p_order_id: params.orderId ?? null,
  });
  if (error) {
    console.error('[campaign-codes] reserve failed:', error.message);
    return { ...mapQuote(null, params.listAmountPaise), redemption_id: null };
  }
  const row = Array.isArray(data) ? (data[0] as RpcReserveRow | undefined) : (data as RpcReserveRow);
  return {
    ...mapQuote(row, params.listAmountPaise),
    redemption_id: row?.redemption_id ?? null,
  };
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
