/**
 * Pure URL builder for marketing tracking links (UTM tags, Meta Ads, and Creator identifiers).
 * Safely handles absolute/relative destination paths, query parameters, and fragments.
 * Safe for use in both Client and Server Components.
 */

const CANONICAL_HOST = 'https://interviewera.com';

export interface BuildTrackingUrlParams {
  destinationPath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
  utmTerm?: string | null;
  creatorId?: string | null;
  metaCampaignId?: string | null;
  metaAdsetId?: string | null;
  metaAdId?: string | null;
}

export function buildTrackingUrl(params: BuildTrackingUrlParams): string {
  let url: URL;
  const rawDest = params.destinationPath.trim() || '/';

  if (rawDest.startsWith('http://') || rawDest.startsWith('https://')) {
    try {
      url = new URL(rawDest);
    } catch {
      url = new URL('/', CANONICAL_HOST);
    }
  } else {
    const cleanPath = rawDest.startsWith('/') ? rawDest : `/${rawDest}`;
    try {
      url = new URL(cleanPath, CANONICAL_HOST);
    } catch {
      url = new URL('/', CANONICAL_HOST);
    }
  }

  // Set standard UTM parameters (normalized lowercase for source and medium)
  url.searchParams.set('utm_source', params.utmSource.trim().toLowerCase());
  url.searchParams.set('utm_medium', params.utmMedium.trim().toLowerCase());
  url.searchParams.set('utm_campaign', params.utmCampaign.trim());

  if (params.utmContent?.trim()) {
    url.searchParams.set('utm_content', params.utmContent.trim());
  }
  if (params.utmTerm?.trim()) {
    url.searchParams.set('utm_term', params.utmTerm.trim());
  }
  if (params.creatorId?.trim()) {
    url.searchParams.set('creator', params.creatorId.trim());
  }

  // Meta platform identifiers
  if (params.metaCampaignId?.trim()) {
    url.searchParams.set('meta_campaign_id', params.metaCampaignId.trim());
  }
  if (params.metaAdsetId?.trim()) {
    url.searchParams.set('meta_adset_id', params.metaAdsetId.trim());
  }
  if (params.metaAdId?.trim()) {
    url.searchParams.set('meta_ad_id', params.metaAdId.trim());
  }

  return url.toString();
}
