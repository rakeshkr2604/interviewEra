import { describe, expect, it } from 'vitest';
import { pickBetterDisplayQuote } from './display-quote';

describe('pickBetterDisplayQuote', () => {
  it('keeps the campaign quote when it is strictly cheaper', () => {
    expect(
      pickBetterDisplayQuote(
        { final_amount_paise: 26900, source: 'coupon' },
        { final_amount_paise: 23900, source: 'campaign' },
      ),
    ).toEqual({ final_amount_paise: 23900, source: 'campaign' });
  });

  it('keeps the coupon quote when equal or cheaper', () => {
    expect(
      pickBetterDisplayQuote(
        { final_amount_paise: 20900, source: 'coupon' },
        { final_amount_paise: 23900, source: 'campaign' },
      ),
    ).toEqual({ final_amount_paise: 20900, source: 'coupon' });
    expect(
      pickBetterDisplayQuote(
        { final_amount_paise: 23900, source: 'coupon' },
        { final_amount_paise: 23900, source: 'campaign' },
      ),
    ).toEqual({ final_amount_paise: 23900, source: 'coupon' });
  });
});
