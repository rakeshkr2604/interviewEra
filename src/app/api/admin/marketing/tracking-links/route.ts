/**
 * GET/POST /api/admin/marketing/tracking-links
 *
 * Manage marketing tracking links (UTMs, Meta Ads, creator tracking).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

const createLinkSchema = z.object({
  name: z.string().trim().min(1).max(160),
  channel: z
    .enum(['meta', 'google', 'creator', 'linkedin', 'twitter', 'email', 'custom'])
    .default('meta'),
  pricing_campaign_id: z.string().uuid().optional().nullable(),
  utm_source: z.string().trim().min(1).max(128),
  utm_medium: z.string().trim().min(1).max(128),
  utm_campaign: z.string().trim().min(1).max(128),
  utm_content: z.string().trim().max(128).optional().nullable(),
  utm_term: z.string().trim().max(128).optional().nullable(),
  platform_metadata: z
    .object({
      meta_campaign_id: z.string().trim().max(64).optional(),
      meta_adset_id: z.string().trim().max(64).optional(),
      meta_ad_id: z.string().trim().max(64).optional(),
    })
    .optional()
    .default({}),
  creator_id: z.string().trim().max(64).optional().nullable(),
  destination_path: z.string().trim().min(1).default('/'),
});

import { buildTrackingUrl } from '@/lib/marketing/tracking-url';

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('marketing_tracking_links')
    .select(
      'id, name, channel, pricing_campaign_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, platform_metadata, creator_id, destination_path, full_url, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (dbErr) {
    console.error('[marketing/tracking-links] list error:', dbErr.message);
    const missing = /marketing_tracking_links/i.test(dbErr.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Database migration 104 not applied yet. Run supabase/migrations/104_standardize_campaign_operations.sql in the Supabase SQL Editor.'
          : 'Failed to load tracking links',
        links: [],
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid tracking link input' },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Build the complete tracking URL safely
  let fullUrl: string;
  try {
    fullUrl = buildTrackingUrl({
      destinationPath: input.destination_path,
      utmSource: input.utm_source,
      utmMedium: input.utm_medium,
      utmCampaign: input.utm_campaign,
      utmContent: input.utm_content,
      utmTerm: input.utm_term,
      creatorId: input.creator_id,
      metaCampaignId: input.platform_metadata?.meta_campaign_id,
      metaAdsetId: input.platform_metadata?.meta_adset_id,
      metaAdId: input.platform_metadata?.meta_ad_id,
    });
  } catch (urlErr) {
    return NextResponse.json(
      { error: `Invalid destination URL: ${(urlErr as Error).message}` },
      { status: 400 },
    );
  }

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('marketing_tracking_links')
    .insert({
      name: input.name,
      channel: input.channel,
      pricing_campaign_id: input.pricing_campaign_id || null,
      utm_source: input.utm_source.toLowerCase(),
      utm_medium: input.utm_medium.toLowerCase(),
      utm_campaign: input.utm_campaign,
      utm_content: input.utm_content?.trim() || null,
      utm_term: input.utm_term?.trim() || null,
      platform_metadata: input.platform_metadata ?? {},
      creator_id: input.creator_id?.trim() || null,
      destination_path: input.destination_path,
      full_url: fullUrl,
      created_by: admin!.id,
    })
    .select('*')
    .single();

  if (dbErr) {
    console.error('[marketing/tracking-links] create error:', dbErr.message);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ link: data }, { status: 201 });
}

export const runtime = 'nodejs';
