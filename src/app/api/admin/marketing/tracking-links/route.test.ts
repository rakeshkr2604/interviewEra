import { describe, expect, it } from 'vitest';
import { buildTrackingUrl } from '@/lib/marketing/tracking-url';

describe('buildTrackingUrl', () => {
  it('builds standard UTM parameters on clean relative path', () => {
    const url = buildTrackingUrl({
      destinationPath: '/pricing',
      utmSource: 'facebook',
      utmMedium: 'paid_social',
      utmCampaign: 'sep_offer',
      utmContent: 'video_01',
      utmTerm: 'swe_30d',
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://interviewera.com');
    expect(parsed.pathname).toBe('/pricing');
    expect(parsed.searchParams.get('utm_source')).toBe('facebook');
    expect(parsed.searchParams.get('utm_medium')).toBe('paid_social');
    expect(parsed.searchParams.get('utm_campaign')).toBe('sep_offer');
    expect(parsed.searchParams.get('utm_content')).toBe('video_01');
    expect(parsed.searchParams.get('utm_term')).toBe('swe_30d');
  });

  it('preserves existing query parameters and hash fragments', () => {
    const url = buildTrackingUrl({
      destinationPath: 'https://interviewera.com/pricing?existing=true&ref=navbar#plans',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'search_brand',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('existing')).toBe('true');
    expect(parsed.searchParams.get('ref')).toBe('navbar');
    expect(parsed.searchParams.get('utm_source')).toBe('google');
    expect(parsed.searchParams.get('utm_medium')).toBe('cpc');
    expect(parsed.searchParams.get('utm_campaign')).toBe('search_brand');
    expect(parsed.hash).toBe('#plans');
  });

  it('supports Meta Ads and creator identifiers', () => {
    const url = buildTrackingUrl({
      destinationPath: '/',
      utmSource: 'instagram',
      utmMedium: 'paid_social',
      utmCampaign: 'summer_sale',
      creatorId: 'creator_rachit',
      metaCampaignId: '12020299292',
      metaAdsetId: '12020299293',
      metaAdId: '12020299294',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('creator')).toBe('creator_rachit');
    expect(parsed.searchParams.get('meta_campaign_id')).toBe('12020299292');
    expect(parsed.searchParams.get('meta_adset_id')).toBe('12020299293');
    expect(parsed.searchParams.get('meta_ad_id')).toBe('12020299294');
  });

  it('handles edge cases: spaces, special characters, unicode, and ampersands with safe URL encoding', () => {
    const url = buildTrackingUrl({
      destinationPath: '/pricing?tier=pro&feature=mock+interviews#checkout',
      utmSource: ' Meta Ads ',
      utmMedium: ' paid social ',
      utmCampaign: 'Offer 20% & BOGO',
      utmContent: 'Creative: Video #1 🚀',
      utmTerm: 'code=SWE&role=frontend',
    });

    expect(url).not.toContain('??');
    expect(url).not.toMatch(/&&/);
    expect(url.endsWith('#checkout')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('tier')).toBe('pro');
    expect(parsed.searchParams.get('feature')).toBe('mock interviews');
    expect(parsed.searchParams.get('utm_source')).toBe('meta ads');
    expect(parsed.searchParams.get('utm_medium')).toBe('paid social');
    expect(parsed.searchParams.get('utm_campaign')).toBe('Offer 20% & BOGO');
    expect(parsed.searchParams.get('utm_content')).toBe('Creative: Video #1 🚀');
    expect(parsed.searchParams.get('utm_term')).toBe('code=SWE&role=frontend');
  });

  it('prevents duplicate parameters when destination URL already contains UTM parameters', () => {
    const url = buildTrackingUrl({
      destinationPath: '/pricing?utm_source=old_source&utm_campaign=old_campaign',
      utmSource: 'new_facebook',
      utmMedium: 'cpc',
      utmCampaign: 'new_fall_sale',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.getAll('utm_source')).toEqual(['new_facebook']);
    expect(parsed.searchParams.getAll('utm_campaign')).toEqual(['new_fall_sale']);
  });
});
