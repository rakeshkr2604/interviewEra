import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_QUOTE_RPC_COLUMNS } from '@/lib/campaign-codes';

const migrationPath = join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260816152656_campaign_pricing_floors_and_quote_metadata.sql',
);
const sql = readFileSync(migrationPath, 'utf8');
const rewardsBaseSql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '060_campaign_codes_and_rewards.sql'),
  'utf8',
);
const ownershipSql = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260816155515_harden_campaign_redemption_ownership.sql',
  ),
  'utf8',
);

describe('campaign pricing migration contract', () => {
  it('returns exactly the columns expected by the TypeScript quote mapper', () => {
    const quoteFunction = sql.match(
      /CREATE OR REPLACE FUNCTION public\.quote_campaign_discount[\s\S]+?RETURNS TABLE \(([\s\S]+?)\)\s*LANGUAGE plpgsql/,
    );
    expect(quoteFunction).not.toBeNull();

    const returnedColumns = quoteFunction![1]
      .split(',')
      .map((definition) => definition.trim().split(/\s+/)[0]);
    expect(returnedColumns).toEqual(CAMPAIGN_QUOTE_RPC_COLUMNS);

    const returnedTypes = quoteFunction![1]
      .split(',')
      .map((definition) => definition.trim().split(/\s+/)[1]);
    expect(returnedTypes).toEqual([
      'BOOLEAN',
      'TEXT',
      'UUID',
      'INTEGER',
      'INTEGER',
      'TEXT',
      'TEXT',
      'TEXT',
      'INTEGER',
      'TIMESTAMPTZ',
      'TIMESTAMPTZ',
      'BOOLEAN',
      'TIMESTAMPTZ',
    ]);
  });

  it('keeps max-use and expiry checks in the atomic reservation update', () => {
    expect(sql).toMatch(
      /UPDATE public\.campaign_codes c[\s\S]+c\.redemption_count < c\.max_redemptions/,
    );
    expect(sql).toMatch(/c\.expires_at IS NULL OR c\.expires_at > clock_timestamp\(\)/);
    expect(sql).toContain("WHEN unique_violation THEN");
    expect(sql).not.toMatch(
      /WHEN unique_violation THEN[\s\S]+redemption_count\s*=\s*GREATEST/,
    );
  });

  it('keeps campaign RPCs service-role-only', () => {
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER, INTEGER)',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)',
    );
  });

  it('is safe to rerun immediately without weakening pricing constraints', () => {
    for (const constraint of [
      'campaign_codes_discount_value_nonnegative',
      'campaign_codes_percent_max_50',
    ]) {
      expect(sql).toContain(`DROP CONSTRAINT IF EXISTS ${constraint}`);
      expect(sql).toContain(`ADD CONSTRAINT ${constraint}`);
    }
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION public.quote_campaign_discount',
    );
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION public.reserve_campaign_code',
    );
    expect(sql).toContain('CHECK (discount_value >= 0)');
    expect(sql).toContain(
      "CHECK (discount_type <> 'percent' OR discount_value <= 50) NOT VALID",
    );
  });

  it('replaces unsafe retry release with one active reservation reuse', () => {
    expect(rewardsBaseSql).toContain('idx_campaign_redemptions_user_code_active');
    expect(ownershipSql).not.toMatch(
      /WHERE r\.campaign_code_id = v_code_id[\s\S]{0,250}PERFORM public\.release_campaign_reservation/,
    );
    expect(ownershipSql).toContain('reservation_created BOOLEAN');
    expect(ownershipSql).toContain("'CHECKOUT_INITIALIZING'");
    expect(ownershipSql).toMatch(
      /v_existing\.status = 'reserved'[\s\S]+v_existing\.order_id IS NOT NULL[\s\S]+FALSE,[\s\S]+v_existing\.order_id/,
    );
  });

  it('allows release only for the exact unbound reserved row', () => {
    expect(ownershipSql).toMatch(
      /release_campaign_reservation[\s\S]+id = p_redemption_id[\s\S]+status = 'reserved'[\s\S]+order_id IS NULL/,
    );
    expect(ownershipSql).toContain(
      'redemption_count = GREATEST(0, redemption_count - 1)',
    );
  });

  it('binds redemption and payment atomically with immutable ownership', () => {
    expect(ownershipSql).toContain('CREATE OR REPLACE FUNCTION public.attach_campaign_order');
    expect(ownershipSql).toMatch(
      /attach_campaign_order[\s\S]+FOR UPDATE[\s\S]+INSERT INTO public\.payments[\s\S]+UPDATE public\.campaign_code_redemptions/,
    );
    expect(ownershipSql).toMatch(/status = 'reserved'[\s\S]+order_id IS NULL/);
    expect(ownershipSql).toContain('CREATE UNIQUE INDEX idx_campaign_redemptions_order');
    expect(ownershipSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_campaign_redemption');
  });

  it('consumes only the exact paid payment and preserves replay identifiers', () => {
    const consumeFunction = ownershipSql.match(
      /CREATE OR REPLACE FUNCTION public\.consume_campaign_redemption[\s\S]+?\n\$\$;/,
    );
    expect(consumeFunction).not.toBeNull();
    const consumeSql = consumeFunction![0];

    expect(consumeSql).toMatch(
      /consume_campaign_redemption[\s\S]+order_id IS DISTINCT FROM p_order_id/,
    );
    expect(consumeSql).toMatch(
      /v_redemption\.status = 'consumed'[\s\S]+payment_id IS NOT DISTINCT FROM p_payment_id/,
    );
    expect(consumeSql).toMatch(
      /campaign_redemption_id = v_redemption\.id[\s\S]+p\.order_id = p_order_id[\s\S]+p\.payment_id = p_payment_id[\s\S]+p\.status = 'paid'/,
    );
    expect(consumeSql).not.toMatch(
      /status IN \('reserved', 'consumed'\)[\s\S]+payment_id = p_payment_id/,
    );
  });

  it('stale-releases only abandoned unbound initialization', () => {
    expect(ownershipSql).toMatch(
      /release_stale_campaign_reservations[\s\S]+r\.status = 'reserved'[\s\S]+r\.order_id IS NULL[\s\S]+FOR UPDATE SKIP LOCKED/,
    );
  });

  it('keeps every lifecycle RPC service-role-only', () => {
    for (const signature of [
      'release_campaign_reservation(UUID)',
      'reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)',
      'attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT)',
      'consume_campaign_redemption(UUID, TEXT, TEXT)',
      'release_stale_campaign_reservations(INTEGER)',
    ]) {
      expect(ownershipSql).toContain(`REVOKE ALL ON FUNCTION public.${signature}`);
      expect(ownershipSql).toContain(`GRANT EXECUTE ON FUNCTION public.${signature}`);
    }
  });
});
