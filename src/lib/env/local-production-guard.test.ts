import { describe, expect, it } from 'vitest';
import {
  assertNotLocalProductionTarget,
  findLocalProductionTargets,
} from './local-production-guard';
import { PRODUCTION_SUPABASE_PROJECT_REF, STAGING_SUPABASE_PROJECT_REF } from './staging-environment';

function jwt(ref: string): string {
  return `h.${Buffer.from(JSON.stringify({ ref, role: 'anon' })).toString('base64url')}.s`;
}

const PROD_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
const STAGING_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;

describe('local production guard', () => {
  it('refuses a production Supabase URL locally', () => {
    expect(() => assertNotLocalProductionTarget({ NEXT_PUBLIC_SUPABASE_URL: PROD_URL })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL target production/,
    );
  });

  it('refuses a production key beside a staging URL', () => {
    expect(
      findLocalProductionTargets({
        NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
        SUPABASE_SERVICE_ROLE_KEY: jwt(PRODUCTION_SUPABASE_PROJECT_REF),
      }),
    ).toEqual(['SUPABASE_SERVICE_ROLE_KEY']);
  });

  it('refuses live Razorpay keys locally', () => {
    expect(findLocalProductionTargets({ RAZORPAY_KEY_ID: 'rzp_live_x' })).toEqual(['RAZORPAY_KEY_ID']);
  });

  it('never includes secret values in the error', () => {
    const secret = jwt(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(() => assertNotLocalProductionTarget({ SUPABASE_SERVICE_ROLE_KEY: secret })).toThrow(
      expect.not.stringContaining(secret),
    );
  });

  it('allows staging, placeholder and non-JWT values', () => {
    expect(
      findLocalProductionTargets({
        NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(STAGING_SUPABASE_PROJECT_REF),
        SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_opaque',
        RAZORPAY_KEY_ID: 'rzp_test_x',
      }),
    ).toEqual([]);
    expect(findLocalProductionTargets({ NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co' })).toEqual([]);
    expect(findLocalProductionTargets({})).toEqual([]);
  });

  it.each(['VERCEL', 'VERCEL_ENV', 'CI'])('does not block deployments when %s is set', (name) => {
    expect(() =>
      assertNotLocalProductionTarget({
        NEXT_PUBLIC_SUPABASE_URL: PROD_URL,
        RAZORPAY_KEY_ID: 'rzp_live_x',
        [name]: name === 'VERCEL_ENV' ? 'production' : '1',
      }),
    ).not.toThrow();
  });
});
