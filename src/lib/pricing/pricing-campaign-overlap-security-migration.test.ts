import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql104 = fs
  .readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '104_standardize_campaign_operations.sql'),
    'utf8',
  )
  .replace(/\r\n/g, '\n');

const sql105 = fs
  .readFileSync(
    path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '105_lock_down_pricing_campaign_overlap_function.sql',
    ),
    'utf8',
  )
  .replace(/\r\n/g, '\n');

describe('105 guard_pricing_campaign_overlap security lockdown contract', () => {
  it('104 defines trigger function with search_path = public and SECURITY DEFINER', () => {
    expect(sql104).toContain('CREATE OR REPLACE FUNCTION public.guard_pricing_campaign_overlap()');
    expect(sql104).toContain('RETURNS TRIGGER');
    expect(sql104).toContain('SECURITY DEFINER');
    expect(sql104).toContain('SET search_path = public');
    expect(sql104).toContain('BEFORE INSERT OR UPDATE ON public.pricing_campaigns');
  });

  it('105 revokes direct EXECUTE on guard_pricing_campaign_overlap from PUBLIC, anon, and authenticated', () => {
    expect(sql105).toContain(
      'REVOKE EXECUTE\nON FUNCTION public.guard_pricing_campaign_overlap()\nFROM PUBLIC;',
    );
    expect(sql105).toContain(
      'REVOKE EXECUTE\nON FUNCTION public.guard_pricing_campaign_overlap()\nFROM anon;',
    );
    expect(sql105).toContain(
      'REVOKE EXECUTE\nON FUNCTION public.guard_pricing_campaign_overlap()\nFROM authenticated;',
    );
  });

  it('105 does not include unnecessary grant to service_role (least privilege)', () => {
    expect(sql105).not.toContain('GRANT EXECUTE');
  });
});
