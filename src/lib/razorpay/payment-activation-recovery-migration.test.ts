import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260817065517_phase7a_payment_activation_recovery.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('Phase 7A payment activation recovery migration', () => {
  it('adds durable entitlement and payment-ledger ownership', () => {
    expect(sql).toContain('entitlement_credits INTEGER');
    expect(sql).toContain('entitlement_plan_started_at TIMESTAMPTZ');
    expect(sql).toContain('entitlement_plan_expires_at TIMESTAMPTZ');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS payment_id TEXT');
    expect(sql).toContain('uq_credit_transactions_payment_credit');
  });

  it('keeps activation ownership on users.last_payment_id', () => {
    const functionBody = sql.match(
      /CREATE OR REPLACE FUNCTION public\.complete_payment_activation_local[\s\S]*?\$function\$;/,
    )?.[0];
    expect(functionBody).toBeDefined();
    expect(functionBody).toContain(
      'v_user.last_payment_id IS DISTINCT FROM p_payment_id',
    );
    expect(functionBody).toContain(
      'v_user.last_order_id IS DISTINCT FROM p_order_id',
    );
    expect(functionBody).not.toMatch(
      /v_payment\.status\s*=\s*'paid'[\s\S]*activation ownership/i,
    );
  });

  it('fails closed for ambiguous history and uses an atomic unique ledger identity', () => {
    expect(sql).toContain('Historical payment credit recovery is ambiguous');
    expect(sql).toContain('Payment order row missing; recovery is ambiguous');
    expect(sql).toContain('ON CONFLICT (payment_id)');
    expect(sql).toContain("WHERE payment_id IS NOT NULL AND type = 'credit'");
  });

  it('is service-role-only and exposes no arbitrary credit or plan parameters', () => {
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.complete_payment_activation_local\(UUID, TEXT, TEXT\)[\s\S]*FROM PUBLIC, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.complete_payment_activation_local\(UUID, TEXT, TEXT\)[\s\S]*TO service_role;/,
    );
    expect(sql).not.toMatch(/p_(?:credit|amount|plan|expiry)/i);
  });

  it('never mutates entitlement or campaign state inside the recovery RPC', () => {
    const functionBody = sql.match(
      /CREATE OR REPLACE FUNCTION public\.complete_payment_activation_local[\s\S]*?\$function\$;/,
    )?.[0];
    expect(functionBody).toBeDefined();
    expect(functionBody).not.toMatch(/UPDATE public\.users/i);
    expect(functionBody).not.toMatch(/campaign_code_redemptions/i);
    expect(functionBody).toContain('UPDATE public.payments');
    expect(functionBody).toContain('INSERT INTO public.credit_transactions');
  });
});
