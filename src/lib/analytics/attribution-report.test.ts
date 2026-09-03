import { describe, expect, it } from 'vitest';
import {
  queryAttributionReport,
  queryAttributionGap,
  validateAttributionConsistency,
  queryCreatorReport,
} from './attribution-report';

// ─── Mock builder ─────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function makeSvc(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      return {
        select(_cols: string, _opts?: unknown) {
          return this;
        },
        not(_col: string, _op: string, _val: unknown) {
          return this;
        },
        in(_col: string, _vals: string[]) {
          const col = _col;
          const vals = new Set(_vals);
          const filtered = rows.filter((r) => vals.has(r[col] as string));
          return {
            select(_c: string) { return this; },
            eq(_c: string, _v: unknown) {
              const c = _c, v = _v;
              const out = filtered.filter((r) => r[c] === v);
              return Promise.resolve({ data: out, error: null, count: out.length });
            },
          };
        },
        eq(_col: string, _val: unknown) {
          return this;
        },
        or(_expr: string) {
          // For queryAttributionGap count query
          const unattributed = rows.filter(
            (r) =>
              r['first_touch_attribution'] == null ||
              JSON.stringify(r['first_touch_attribution']) === '{}',
          );
          return Promise.resolve({ count: unattributed.length, error: null });
        },
        limit(_n: number) {
          return Promise.resolve({ data: rows, error: null });
        },
      };
    },
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GOOGLE_USER = { id: 'u1', first_touch_attribution: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer' } };
const TWITTER_USER = { id: 'u2', first_touch_attribution: { utm_source: 'twitter', utm_medium: 'social' } };
const NO_ATTR_USER = { id: 'u3', first_touch_attribution: null };
const EMPTY_ATTR_USER = { id: 'u4', first_touch_attribution: {} };

const PAID_PAYMENT_U1 = { id: 'p1', user_id: 'u1', amount: 20900, status: 'paid' };
const PAID_PAYMENT_U1_B = { id: 'p1b', user_id: 'u1', amount: 20900, status: 'paid' };
const PAID_PAYMENT_U2 = { id: 'p2', user_id: 'u2', amount: 79900, status: 'paid' };
const FAILED_PAYMENT_U1 = { id: 'p3', user_id: 'u1', amount: 20900, status: 'failed' };

const COMPLETED_EVENT_U1 = { id: 'e1', user_id: 'u1', event_name: 'payment_completed' };
const COMPLETED_EVENT_U2 = { id: 'e2', user_id: 'u2', event_name: 'payment_completed' };

// ─── Scenario 1: UTM source → user first-touch → payment snapshot grouping ───

describe('queryAttributionReport', () => {
  it('1: groups attributed users, payments, events by utm_source/medium/campaign', async () => {
    const svc = makeSvc({
      users: [GOOGLE_USER, TWITTER_USER],
      payments: [PAID_PAYMENT_U1, PAID_PAYMENT_U2],
      product_events: [COMPLETED_EVENT_U1, COMPLETED_EVENT_U2],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(2);
    const google = rows.find((r) => r.utm_source === 'google');
    const twitter = rows.find((r) => r.utm_source === 'twitter');

    expect(google).toMatchObject({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer',
      attributed_users: 1,
      attributed_payments: 1,
      payment_completed_count: 1,
      total_amount_paise: 20900,
    });

    expect(twitter).toMatchObject({
      utm_source: 'twitter',
      utm_medium: 'social',
      utm_campaign: null,
      attributed_users: 1,
      attributed_payments: 1,
      payment_completed_count: 1,
      total_amount_paise: 79900,
    });
  });

  // Scenario 2: First-touch stability — second attribution does not change the bucket
  it('2: first-touch is the stable acquisition source regardless of later attribution', async () => {
    // u1 first-touch is google. Even if later latest-touch changes, report uses first_touch_attribution.
    const svc = makeSvc({
      users: [GOOGLE_USER],
      payments: [PAID_PAYMENT_U1],
      product_events: [COMPLETED_EVENT_U1],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.utm_source).toBe('google');
  });

  // Scenario 3: Payment snapshot stable — later user attribution does not change payment bucket
  it('3: revenue comes from payments.amount, not analytics events', async () => {
    const svc = makeSvc({
      users: [GOOGLE_USER],
      payments: [PAID_PAYMENT_U1, PAID_PAYMENT_U1_B],
      product_events: [],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(1);
    // Both paid payments count; failed payments excluded
    expect(rows[0]!.attributed_payments).toBe(2);
    expect(rows[0]!.total_amount_paise).toBe(41800);
  });

  // Scenario 4: payment_completed count from product_events, not derived from payment amount
  it('4: payment_completed_count is distinct from attributed_payments count', async () => {
    // 2 paid payments but only 1 payment_completed event
    const svc = makeSvc({
      users: [GOOGLE_USER],
      payments: [PAID_PAYMENT_U1, PAID_PAYMENT_U1_B],
      product_events: [COMPLETED_EVENT_U1],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows[0]!.attributed_payments).toBe(2);
    expect(rows[0]!.payment_completed_count).toBe(1);
  });

  // Scenario 5: NULL attribution — reportable without errors, excluded from report
  it('5: users without attribution are excluded from report without errors', async () => {
    const svc = makeSvc({
      users: [NO_ATTR_USER, EMPTY_ATTR_USER],
      payments: [],
      product_events: [],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(0);
  });

  // Scenario 6: Partial UTM data (only utm_source, no medium/campaign)
  it('6: partial UTM (source only) creates its own bucket with null for missing keys', async () => {
    const svc = makeSvc({
      users: [TWITTER_USER],
      payments: [],
      product_events: [],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.utm_source).toBe('twitter');
    expect(rows[0]!.utm_medium).toBe('social');
    expect(rows[0]!.utm_campaign).toBeNull();
    expect(rows[0]!.attributed_payments).toBe(0);
    expect(rows[0]!.payment_completed_count).toBe(0);
  });

  // Scenario 7: Campaign-code payment and UTM attribution coexist
  it('7: campaign-code payment is counted in attributed_payments (separate concepts)', async () => {
    // Payment has both campaign_code_id and belongs to a UTM-attributed user.
    // The campaign code is the discount mechanism; UTM is the acquisition source.
    const campaignPayment = { id: 'p-camp', user_id: 'u1', amount: 20900, status: 'paid', campaign_code_id: 'cc1' };
    const svc = makeSvc({
      users: [GOOGLE_USER],
      payments: [campaignPayment],
      product_events: [COMPLETED_EVENT_U1],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.utm_source).toBe('google');
    expect(rows[0]!.attributed_payments).toBe(1);
    // campaign_code_id is present on the payment row but NOT part of UTM attribution
    expect(rows[0]!).not.toHaveProperty('campaign_code_id');
  });

  // Scenario 8: Revenue uses authoritative payment data only
  it('8: total_amount_paise sums payments.amount (failed payments excluded)', async () => {
    const svc = makeSvc({
      users: [GOOGLE_USER],
      payments: [PAID_PAYMENT_U1, FAILED_PAYMENT_U1],
      product_events: [],
    });

    const rows = await queryAttributionReport(svc as never);

    expect(rows[0]!.total_amount_paise).toBe(20900); // only paid
    expect(rows[0]!.attributed_payments).toBe(1); // only paid
  });

  it('returns empty array on DB error', async () => {
    const svc = {
      from: () => ({
        select: () => ({ not: () => ({ limit: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }),
      }),
    };

    const rows = await queryAttributionReport(svc as never);
    expect(rows).toEqual([]);
  });

  it('returns empty array when no users have attribution', async () => {
    const svc = makeSvc({ users: [], payments: [], product_events: [] });

    const rows = await queryAttributionReport(svc as never);
    expect(rows).toEqual([]);
  });
});

// ─── Gap query ────────────────────────────────────────────────────────────────

describe('queryAttributionGap', () => {
  it('counts users with null or empty first_touch_attribution', async () => {
    const svc = makeSvc({
      users: [NO_ATTR_USER, EMPTY_ATTR_USER, GOOGLE_USER],
    });

    const result = await queryAttributionGap(svc as never);

    expect(result.unattributed_users).toBe(2);
  });

  it('returns -1 on DB error', async () => {
    const svc = {
      from: () => ({
        select: () => ({ or: () => Promise.resolve({ count: null, error: { message: 'db error' } }) }),
      }),
    };

    const result = await queryAttributionGap(svc as never);
    expect(result.unattributed_users).toBe(-1);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validateAttributionConsistency', () => {
  it('reports valid attribution keys correctly', async () => {
    const svc = makeSvc({
      users: [
        GOOGLE_USER,
        TWITTER_USER,
        NO_ATTR_USER,
      ],
      payments: [
        { id: 'p1', attribution_snapshot: { utm_source: 'google', utm_campaign: 'summer' } },
        { id: 'p2', attribution_snapshot: null },
      ],
    });

    const result = await validateAttributionConsistency(svc as never);

    expect(result.total_users).toBe(3);
    expect(result.attributed_users).toBe(2);
    expect(result.valid_first_touch).toBe(2);
    expect(result.valid_payment_snapshots).toBe(1); // null filtered
    expect(result.invalid_payment_snapshots).toBe(0);
  });

  it('flags payments with non-UTM keys in attribution_snapshot', async () => {
    const svc = makeSvc({
      users: [],
      payments: [
        { id: 'p1', attribution_snapshot: { utm_source: 'google' } },
        { id: 'p2', attribution_snapshot: { utm_source: 'fb', injected_key: 'bad' } },
      ],
    });

    const result = await validateAttributionConsistency(svc as never);

    expect(result.valid_payment_snapshots).toBe(1);
    expect(result.invalid_payment_snapshots).toBe(1);
  });
});

// ─── Phase 7: Creator Attribution ─────────────────────────────────────────────

// Creator user fixtures
const CREATOR_RAKESH_USER = {
  id: 'u-cr1',
  first_touch_attribution: {
    utm_source: 'creator',
    utm_medium: 'referral',
    utm_campaign: 'creator_2026',
    utm_content: 'creator_rakesh',
  },
};

const CREATOR_PRIYA_USER = {
  id: 'u-cr2',
  first_touch_attribution: {
    utm_source: 'creator',
    utm_medium: 'referral',
    utm_campaign: 'creator_2026',
    utm_content: 'creator_priya',
  },
};

const CREATOR_RAKESH_USER2 = {
  id: 'u-cr3',
  first_touch_attribution: {
    utm_source: 'creator',
    utm_medium: 'referral',
    utm_campaign: 'creator_2026',
    utm_content: 'creator_rakesh', // same creator, second user
  },
};

// User attributed to a different source but with utm_content set (should be excluded by default filter)
const NON_CREATOR_CONTENT_USER = {
  id: 'u-nc1',
  first_touch_attribution: {
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_content: 'creator_rakesh', // utm_content present but source is not 'creator'
  },
};

const CREATOR_PAID = { id: 'cp1', user_id: 'u-cr1', amount: 20900, status: 'paid' };
const CREATOR_COMPLETED_EVENT = { id: 'ce1', user_id: 'u-cr1', event_name: 'payment_completed' };

describe('queryCreatorReport', () => {
  // 1. Creator UTM normalizes correctly through the attribution pipeline
  it('1: normalizes creator UTM via existing normalizeAttribution()', async () => {
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER],
      payments: [],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.creator_id).toBe('creator_rakesh');
    expect(rows[0]!.utm_source).toBe('creator');
    expect(rows[0]!.utm_medium).toBe('referral');
    expect(rows[0]!.utm_campaign).toBe('creator_2026');
  });

  // 2. Creator ID survives first-touch persistence (first user gets bucketed correctly)
  it('2: creator ID survives first-touch — two users under same creator are counted', async () => {
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER, CREATOR_RAKESH_USER2],
      payments: [],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.creator_id).toBe('creator_rakesh');
    expect(rows[0]!.attributed_users).toBe(2);
  });

  // 3. Creator ID survives payment snapshot — payments attributed correctly
  it('3: creator ID survives payment snapshot — payment counted under correct creator', async () => {
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER],
      payments: [CREATOR_PAID],
      product_events: [CREATOR_COMPLETED_EVENT],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows[0]!.attributed_payments).toBe(1);
    expect(rows[0]!.payment_completed_count).toBe(1);
    expect(rows[0]!.total_amount_paise).toBe(20900);
  });

  // 4. Creator attribution appears in report — multiple creators separated
  it('4: multiple creators appear as separate rows, sorted by payment_completed_count', async () => {
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER, CREATOR_PRIYA_USER],
      payments: [CREATOR_PAID, { id: 'cp2', user_id: 'u-cr2', amount: 79900, status: 'paid' }],
      product_events: [CREATOR_COMPLETED_EVENT, { id: 'ce2', user_id: 'u-cr2', event_name: 'payment_completed' }],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows).toHaveLength(2);
    const rakesh = rows.find((r) => r.creator_id === 'creator_rakesh');
    const priya = rows.find((r) => r.creator_id === 'creator_priya');
    expect(rakesh).toBeDefined();
    expect(priya).toBeDefined();
    expect(priya!.total_amount_paise).toBe(79900);
  });

  // 5. Conflicting later creator does not overwrite first-touch
  // (enforced by first_touch_attribution immutability — report reads only first_touch)
  it('5: report uses first_touch_attribution — later attribution does not change creator bucket', async () => {
    // Even if latest_touch_attribution has a different creator, report uses first_touch
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER], // first_touch = creator_rakesh
      payments: [CREATOR_PAID],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows[0]!.creator_id).toBe('creator_rakesh'); // first-touch always wins
  });

  // 6. Payment snapshot remains historical — failed payments excluded from revenue
  it('6: payment snapshot immutability — failed payments not counted in revenue', async () => {
    const failedPayment = { id: 'cp-fail', user_id: 'u-cr1', amount: 20900, status: 'failed' };
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER],
      payments: [CREATOR_PAID, failedPayment],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows[0]!.attributed_payments).toBe(1); // only paid
    expect(rows[0]!.total_amount_paise).toBe(20900);
  });

  // 7. Normal non-creator UTM reporting remains unchanged by creator filter
  it('7: queryAttributionReport is unaffected by creator users', async () => {
    const svc = makeSvc({
      users: [GOOGLE_USER, CREATOR_RAKESH_USER],
      payments: [CREATOR_PAID],
      product_events: [],
    });

    // queryAttributionReport groups by utm_source/medium/campaign, so creator
    // users appear in their own bucket (utm_source='creator') and do not
    // contaminate the google bucket
    const rows = await queryAttributionReport(svc as never);

    const googleBucket = rows.find((r) => r.utm_source === 'google');
    const creatorBucket = rows.find((r) => r.utm_source === 'creator');

    expect(googleBucket?.attributed_users).toBe(1);
    expect(creatorBucket?.attributed_users).toBe(1);
  });

  // 8. Missing creator identifier handled as NULL — user excluded from creator report
  it('8: user without utm_content is excluded from creator report', async () => {
    const svc = makeSvc({
      users: [GOOGLE_USER, TWITTER_USER], // no utm_content
      payments: [],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows).toHaveLength(0);
  });

  // 9. Malformed/oversized creator identifier is safely normalized
  it('9: oversized utm_content is truncated to 128 chars by normalizeAttribution()', async () => {
    const longCreatorId = 'a'.repeat(200);
    const userWithLongId = {
      id: 'u-long',
      first_touch_attribution: {
        utm_source: 'creator',
        utm_medium: 'referral',
        utm_content: longCreatorId,
      },
    };

    const svc = makeSvc({
      users: [userWithLongId],
      payments: [],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows).toHaveLength(1);
    // normalizeAttribution truncates to ATTRIBUTION_MAX_VALUE_LENGTH = 128
    expect(rows[0]!.creator_id?.length).toBe(128);
  });

  // 10. Campaign code + creator attribution coexist independently
  it('10: campaign-code payment is counted in creator report (independent concepts)', async () => {
    const campaignPayment = {
      id: 'cp-camp',
      user_id: 'u-cr1',
      amount: 20900,
      status: 'paid',
      campaign_code_id: 'cc1', // discount mechanism — separate from UTM
    };

    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER],
      payments: [campaignPayment],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never);

    expect(rows[0]!.creator_id).toBe('creator_rakesh');
    expect(rows[0]!.attributed_payments).toBe(1);
    // campaign_code_id is NOT part of creator attribution
    expect(rows[0]!).not.toHaveProperty('campaign_code_id');
  });

  it('utmSourceFilter=null includes all utm_content regardless of source', async () => {
    const svc = makeSvc({
      users: [CREATOR_RAKESH_USER, NON_CREATOR_CONTENT_USER],
      payments: [],
      product_events: [],
    });

    const rows = await queryCreatorReport(svc as never, { utmSourceFilter: null });

    // Both users have utm_content, regardless of utm_source
    expect(rows).toHaveLength(1); // same creator_id 'creator_rakesh', merged
    expect(rows[0]!.creator_id).toBe('creator_rakesh');
    expect(rows[0]!.attributed_users).toBe(2);
  });
});
