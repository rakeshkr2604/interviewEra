'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  History,
  Layers,
  Link as LinkIcon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  ShieldAlert,
  Square,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import type { CampaignStatus } from '@/lib/pricing/effective-price';
import { buildTrackingUrl } from '@/lib/marketing/tracking-url';

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

type PricingCampaign = {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  is_active: boolean;
  discount_type: 'percent' | 'flat_paise';
  discount_value: number;
  applies_to_plans: PaidPlanId[];
  starts_at: string;
  ends_at: string;
  display_label: string | null;
  display_badge: string | null;
  parent_campaign_id?: string | null;
  archived_at?: string | null;
  performance?: {
    checkouts_count: number;
    paid_orders_count: number;
    gross_revenue_paise: number;
  };
};

type AuditLogRow = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  admin_id?: string | null;
};

type TrackingLink = {
  id: string;
  name: string;
  channel: string;
  pricing_campaign_id: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  destination_path: string;
  full_url: string;
  created_at: string;
};

function dateInputToIso(dateStr: string): string | null {
  if (!dateStr.trim()) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isoToDateTimeLocal(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function selectedPlans(starter: boolean, pro: boolean): PaidPlanId[] {
  const plans: PaidPlanId[] = [];
  if (starter) plans.push('starter');
  if (pro) plans.push('pro');
  return plans;
}

function pricePreview(
  plan: PaidPlanId,
  discountType: 'percent' | 'flat_paise',
  discountValue: number,
): { text: string; ok: boolean } {
  const config = getPaidPlan(plan);
  const quote = computeCampaignDiscountQuote({
    listAmountPaise: config.amountPaise,
    promoFloorPaise: config.promoFloorPaise,
    discountType,
    discountValue,
  });
  if (!quote.ok) {
    return {
      text: `${config.label}: invalid (${quote.error_code ?? 'below floor'})`,
      ok: false,
    };
  }
  return {
    text: `${config.label}: ₹${Math.round(quote.final_amount_paise / 100)} (was ₹${Math.round(config.amountPaise / 100)})`,
    ok: true,
  };
}

function formatTimeRemaining(endsAt: string): string {
  const ms = Date.parse(endsAt) - Date.now();
  if (ms <= 0) return 'Ended';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 1) return `Ends in ${days} days`;
  if (hours > 1) return `Ends in ${hours} hours`;
  const mins = Math.floor(ms / (1000 * 60));
  return `Ends in ${mins} mins`;
}

export function GlobalOffersPanel() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'tracking'>('campaigns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<PricingCampaign[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat_paise'>('percent');
  const [discountValue, setDiscountValue] = useState(20);
  const [starter, setStarter] = useState(true);
  const [pro, setPro] = useState(true);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [badge, setBadge] = useState('LIMITED TIME');
  const [label, setLabel] = useState('20% OFF');
  const [createMode, setCreateMode] = useState<'draft' | 'scheduled' | 'active'>('active');
  const [saving, setSaving] = useState(false);

  // Interactive Modals
  const [extendModalCampaign, setExtendModalCampaign] = useState<PricingCampaign | null>(null);
  const [newEndsDate, setNewEndsDate] = useState('');
  const [continueModalCampaign, setContinueModalCampaign] = useState<PricingCampaign | null>(null);
  const [continueStarts, setContinueStarts] = useState('');
  const [continueEnds, setContinueEnds] = useState('');
  const [deleteModalCampaign, setDeleteModalCampaign] = useState<PricingCampaign | null>(null);
  const [deleteSafety, setDeleteSafety] = useState<{ canDelete: boolean; count: number } | null>(null);
  const [historyModalCampaign, setHistoryModalCampaign] = useState<PricingCampaign | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Tracking link builder state
  const [linkName, setLinkName] = useState('');
  const [linkChannel, setLinkChannel] = useState<'meta' | 'google' | 'creator' | 'linkedin' | 'twitter' | 'email' | 'custom'>('meta');
  const [linkCampaignId, setLinkCampaignId] = useState<string>('');
  const [linkSource, setLinkSource] = useState('facebook');
  const [linkMedium, setLinkMedium] = useState('paid_social');
  const [linkUtmCampaign, setLinkUtmCampaign] = useState('');
  const [linkContent, setLinkContent] = useState('');
  const [linkTerm, setLinkTerm] = useState('');
  const [linkCreator, setLinkCreator] = useState('');
  const [linkDest, setLinkDest] = useState('/pricing');
  const [metaCampaignId, setMetaCampaignId] = useState('');
  const [metaAdsetId, setMetaAdsetId] = useState('');
  const [metaAdId, setMetaAdId] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing-campaigns');
      const json = (await res.json()) as { campaigns?: PricingCampaign[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to load campaigns');
      setCampaigns(json.campaigns ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tracking links
  const loadTrackingLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/marketing/tracking-links');
      const json = (await res.json()) as { links?: TrackingLink[]; error?: string };
      if (res.ok && json.links) {
        setTrackingLinks(json.links);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
    void loadTrackingLinks();
  }, [loadCampaigns, loadTrackingLinks]);

  // Channel preset helper
  function handleChannelPreset(ch: 'meta' | 'google' | 'creator' | 'linkedin' | 'twitter' | 'email' | 'custom') {
    setLinkChannel(ch);
    if (ch === 'meta') {
      setLinkSource('facebook');
      setLinkMedium('paid_social');
    } else if (ch === 'google') {
      setLinkSource('google');
      setLinkMedium('cpc');
    } else if (ch === 'creator') {
      setLinkSource('creator');
      setLinkMedium('influencer');
    } else if (ch === 'linkedin') {
      setLinkSource('linkedin');
      setLinkMedium('paid_social');
    } else if (ch === 'twitter') {
      setLinkSource('x');
      setLinkMedium('social');
    } else if (ch === 'email') {
      setLinkSource('newsletter');
      setLinkMedium('email');
    }
  }

  // Pre-fill UTM campaign if linked to a pricing campaign
  useEffect(() => {
    if (linkCampaignId) {
      const camp = campaigns.find((c) => c.id === linkCampaignId);
      if (camp) {
        setLinkUtmCampaign(camp.slug);
        if (!linkName) setLinkName(`${camp.name} - ${linkChannel.toUpperCase()}`);
      }
    }
  }, [linkCampaignId, campaigns, linkChannel, linkName]);

  // Preview generated URL
  const generatedPreviewUrl = useMemo(() => {
    try {
      return buildTrackingUrl({
        destinationPath: linkDest || '/',
        utmSource: linkSource || 'source',
        utmMedium: linkMedium || 'medium',
        utmCampaign: linkUtmCampaign || 'campaign',
        utmContent: linkContent || null,
        utmTerm: linkTerm || null,
        creatorId: linkCreator || null,
        metaCampaignId: metaCampaignId || null,
        metaAdsetId: metaAdsetId || null,
        metaAdId: metaAdId || null,
      });
    } catch {
      return 'Invalid URL parameters';
    }
  }, [linkDest, linkSource, linkMedium, linkUtmCampaign, linkContent, linkTerm, linkCreator, metaCampaignId, metaAdsetId, metaAdId]);

  // Create Campaign action
  async function createCampaign() {
    if (!name.trim()) {
      toast.error('Campaign name is required.');
      return;
    }
    const startsAt = dateInputToIso(starts);
    const endsAt = dateInputToIso(ends);
    if (!startsAt || !endsAt) {
      toast.error('Start and end times are required.');
      return;
    }
    const applies = selectedPlans(starter, pro);
    if (applies.length === 0) {
      toast.error('Select at least one plan.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          discount_type: discountType,
          discount_value: discountValue,
          applies_to_plans: applies,
          starts_at: startsAt,
          ends_at: endsAt,
          display_badge: badge.trim() || null,
          display_label: label.trim() || null,
          status: createMode,
          is_active: createMode === 'active' || createMode === 'scheduled',
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to create campaign');

      toast.success(
        createMode === 'active'
          ? 'Campaign created and activated!'
          : createMode === 'scheduled'
            ? 'Campaign scheduled!'
            : 'Draft campaign saved!',
      );
      setShowCreateForm(false);
      setName('');
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  // Atomic operation dispatcher
  async function runOperation(
    campaignId: string,
    action: 'activate' | 'pause' | 'resume' | 'end' | 'archive' | 'duplicate' | 'restore',
  ) {
    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${campaignId}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Failed to ${action} campaign`);

      toast.success(`Campaign ${action}d successfully`);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action}`);
    }
  }

  // Submit Extend
  async function submitExtend() {
    if (!extendModalCampaign || !newEndsDate) return;
    const iso = dateInputToIso(newEndsDate);
    if (!iso) {
      toast.error('Invalid date format');
      return;
    }

    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${extendModalCampaign.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', new_ends_at: iso }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to extend campaign');

      toast.success(`Window extended for ${extendModalCampaign.name}`);
      setExtendModalCampaign(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Extension failed');
    }
  }

  // Submit Continue / Restart
  async function submitContinue() {
    if (!continueModalCampaign || !continueStarts || !continueEnds) return;
    const startIso = dateInputToIso(continueStarts);
    const endIso = dateInputToIso(continueEnds);
    if (!startIso || !endIso) {
      toast.error('Both start and end dates are required');
      return;
    }

    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${continueModalCampaign.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue', starts_at: startIso, ends_at: endIso }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to restart campaign');

      toast.success(`New instance started for ${continueModalCampaign.name}`);
      setContinueModalCampaign(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Restart failed');
    }
  }

  // Open Delete Safety Modal
  async function openDeleteModal(campaign: PricingCampaign) {
    setDeleteModalCampaign(campaign);
    setDeleteSafety(null);
    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${campaign.id}`);
      const json = (await res.json()) as { performance?: { paid_orders_count: number; checkouts_count: number } };
      const count = (json.performance?.checkouts_count ?? 0) + (json.performance?.paid_orders_count ?? 0);
      setDeleteSafety({ canDelete: count === 0, count });
    } catch {
      setDeleteSafety({ canDelete: false, count: 1 });
    }
  }

  // Execute Delete
  async function confirmDelete() {
    if (!deleteModalCampaign) return;
    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${deleteModalCampaign.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete campaign');

      toast.success('Campaign deleted permanently');
      setDeleteModalCampaign(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deletion failed');
    }
  }

  // Open Audit History Modal
  async function openHistoryModal(campaign: PricingCampaign) {
    setHistoryModalCampaign(campaign);
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/admin/pricing-campaigns/${campaign.id}`);
      const json = (await res.json()) as { audit_logs?: AuditLogRow[] };
      setAuditLogs(json.audit_logs ?? []);
    } catch {
      toast.error('Failed to load audit history');
    } finally {
      setAuditLoading(false);
    }
  }

  // Save Tracking Link
  async function saveTrackingLink() {
    if (!linkName.trim() || !linkSource.trim() || !linkMedium.trim() || !linkUtmCampaign.trim()) {
      toast.error('Please fill in Link Name, Source, Medium, and Campaign.');
      return;
    }

    setSavingLink(true);
    try {
      const res = await fetch('/api/admin/marketing/tracking-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim(),
          channel: linkChannel,
          pricing_campaign_id: linkCampaignId || null,
          utm_source: linkSource.trim(),
          utm_medium: linkMedium.trim(),
          utm_campaign: linkUtmCampaign.trim(),
          utm_content: linkContent.trim() || null,
          utm_term: linkTerm.trim() || null,
          creator_id: linkCreator.trim() || null,
          destination_path: linkDest.trim() || '/',
          platform_metadata: {
            meta_campaign_id: metaCampaignId.trim() || undefined,
            meta_adset_id: metaAdsetId.trim() || undefined,
            meta_ad_id: metaAdId.trim() || undefined,
          },
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to save link');

      toast.success('Tracking link saved!');
      await loadTrackingLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save link');
    } finally {
      setSavingLink(false);
    }
  }

  // Delete tracking link
  async function deleteTrackingLink(id: string) {
    try {
      const res = await fetch(`/api/admin/marketing/tracking-links/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tracking link');
      toast.success('Tracking link removed');
      await loadTrackingLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  // Copy helper
  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedUrl(null), 2500);
    } catch {
      toast.error('Failed to copy');
    }
  }

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (statusFilter === 'all') return campaigns.filter((c) => c.status !== 'archived');
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  // Aggregate stats
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;
  const totalRevenuePaise = campaigns.reduce((acc, c) => acc + (c.performance?.gross_revenue_paise ?? 0), 0);
  const totalPaidOrders = campaigns.reduce((acc, c) => acc + (c.performance?.paid_orders_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Top Header Navigation ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Campaign & Global Offers Operations
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Production control center for global offers, lifecycle operations, and Meta Ads attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'campaigns' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers size={14} />
              Offers & Campaigns
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'tracking' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LinkIcon size={14} />
              UTM & Meta Ads Hub
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadCampaigns();
              void loadTrackingLinks();
            }}
            className="flex items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-colors hover:bg-[color:var(--bg-secondary)]"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            title="Refresh data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Quick KPI Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div style={cardStyle} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Live Active Offers
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--accent-success)' }}>
              {activeCount}
            </span>
            {scheduledCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                +{scheduledCount} scheduled
              </span>
            )}
          </div>
        </div>

        <div style={cardStyle} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Attributed Paid Orders
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalPaidOrders}
          </p>
        </div>

        <div style={cardStyle} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Gross Attributed Rev
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ₹{Math.round(totalRevenuePaise / 100).toLocaleString('en-IN')}
          </p>
        </div>

        <div style={cardStyle} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Active Tracking Links
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
            {trackingLinks.length}
          </p>
        </div>
      </div>

      {/* ── TAB 1: CAMPAIGNS & OFFERS ── */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ['all', 'All Active'],
                  ['active', 'Active'],
                  ['scheduled', 'Scheduled'],
                  ['paused', 'Paused'],
                  ['ended', 'Ended'],
                  ['draft', 'Drafts'],
                  ['archived', 'Archived'],
                ] as const
              ).map(([s, labelText]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    statusFilter === s
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'border text-[var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]'
                  }`}
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  {labelText}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                if (!starts) {
                  const nowLocal = new Date();
                  setStarts(isoToDateTimeLocal(nowLocal.toISOString()));
                  const endLocal = new Date(Date.now() + 3 * 86400 * 1000);
                  setEnds(isoToDateTimeLocal(endLocal.toISOString()));
                }
              }}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition-opacity active:opacity-80"
              style={{ background: 'var(--accent-primary)' }}
            >
              <Plus size={14} />
              {showCreateForm ? 'Close Form' : 'New Campaign'}
            </button>
          </div>

          {/* Create Campaign Card */}
          {showCreateForm && (
            <div style={cardStyle} className="space-y-4 p-5">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Create Global Offer / Campaign
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Display names can be reused. Time windows and plan overlap are validated atomically.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--card-border)' }}>
                  <button
                    type="button"
                    onClick={() => setCreateMode('active')}
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${createMode === 'active' ? 'bg-[var(--accent-success)] text-white' : 'text-[var(--text-secondary)]'}`}
                  >
                    Activate Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('scheduled')}
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${createMode === 'scheduled' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('draft')}
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${createMode === 'draft' ? 'bg-zinc-600 text-white' : 'text-[var(--text-secondary)]'}`}
                  >
                    Save Draft
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Campaign Name
                  </label>
                  <input
                    placeholder="e.g. Weekend Offer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Discount Value & Type
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percent' ? 50 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-24 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                    />
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat_paise')}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="flat_paise">Flat Paise (100 = ₹1)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Applies To Plans
                  </label>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
                      Starter
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
                      Pro
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Start Date & Time (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={starts}
                    onChange={(e) => setStarts(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    End Date & Time (Local)
                  </label>
                  <input
                    type="datetime-local"
                    value={ends}
                    onChange={(e) => setEnds(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Banner Badge & Label
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      placeholder="Badge (e.g. FLASH SALE)"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value.toUpperCase())}
                      className="w-1/2 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                    />
                    <input
                      placeholder="Label (e.g. 20% OFF)"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-1/2 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Price Preview */}
              <div className="rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Effective Price Preview:
                </p>
                <div className="mt-1 flex flex-wrap gap-4" style={{ color: 'var(--text-secondary)' }}>
                  <span>{pricePreview('starter', discountType, discountValue).text}</span>
                  <span>·</span>
                  <span>{pricePreview('pro', discountType, discountValue).text}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createCampaign()}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  {saving ? 'Creating…' : createMode === 'active' ? 'Create & Activate' : createMode === 'scheduled' ? 'Schedule Campaign' : 'Save Draft'}
                </button>
              </div>
            </div>
          )}

          {/* Campaign Cards List */}
          {loading ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading campaigns…
            </p>
          ) : filteredCampaigns.length === 0 ? (
            <div style={cardStyle} className="p-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                No campaigns match the filter ({statusFilter}).
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Use &quot;New Campaign&quot; above to create or schedule an offer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((campaign) => {
                const isLive = campaign.status === 'active';
                const isScheduled = campaign.status === 'scheduled';
                const isPaused = campaign.status === 'paused';
                const isEnded = campaign.status === 'ended';
                const isDraft = campaign.status === 'draft';
                const isArchived = campaign.status === 'archived';

                const statusColor = isLive
                  ? 'var(--accent-success)'
                  : isScheduled
                    ? 'var(--accent-primary)'
                    : isPaused
                      ? 'var(--accent-warning, #f59e0b)'
                      : isEnded
                        ? 'var(--text-muted)'
                        : isDraft
                          ? '#64748b'
                          : '#475569';

                return (
                  <div
                    key={campaign.id}
                    style={cardStyle}
                    className="flex flex-col gap-4 p-5 transition-shadow hover:shadow-md lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: `color-mix(in srgb, ${statusColor} 16%, transparent)`,
                            color: statusColor,
                            border: `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)`,
                          }}
                        >
                          {campaign.status}
                        </span>

                        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                          {campaign.name}
                        </h3>

                        {campaign.display_badge && (
                          <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                            {campaign.display_badge}
                          </span>
                        )}

                        {campaign.parent_campaign_id && (
                          <span className="text-[10px] text-zinc-500" title={`Restarted from ${campaign.parent_campaign_id}`}>
                            (Instance of #{campaign.parent_campaign_id.slice(0, 6)})
                          </span>
                        )}
                      </div>

                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {campaign.discount_type === 'percent'
                            ? `${campaign.discount_value}% OFF`
                            : `₹${Math.round(campaign.discount_value / 100)} OFF`}
                        </span>{' '}
                        · Plans:{' '}
                        {(campaign.applies_to_plans.length ? campaign.applies_to_plans : ['starter', 'pro']).join(', ')}{' '}
                        · Window: {new Date(campaign.starts_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} →{' '}
                        {new Date(campaign.ends_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock size={12} />
                          {formatTimeRemaining(campaign.ends_at)}
                        </span>
                        <span>·</span>
                        <span>Checkouts: {campaign.performance?.checkouts_count ?? 0}</span>
                        <span>·</span>
                        <span>Paid Orders: {campaign.performance?.paid_orders_count ?? 0}</span>
                        <span>·</span>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Attributed Rev: ₹{Math.round((campaign.performance?.gross_revenue_paise ?? 0) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0">
                      {/* Active Actions */}
                      {isLive && (
                        <>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'pause')}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-[color:var(--bg-secondary)]"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Pause size={12} />
                            Pause
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtendModalCampaign(campaign);
                              setNewEndsDate(isoToDateTimeLocal(new Date(Date.parse(campaign.ends_at) + 3 * 86400 * 1000).toISOString()));
                            }}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:bg-[color:var(--bg-secondary)]"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Calendar size={12} />
                            Extend
                          </button>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'end')}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Square size={12} />
                            End Now
                          </button>
                        </>
                      )}

                      {/* Scheduled Actions */}
                      {isScheduled && (
                        <>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'activate')}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                            style={{ background: 'var(--accent-primary)' }}
                          >
                            <Play size={12} />
                            Activate Now
                          </button>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'pause')}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Pause size={12} />
                            Pause
                          </button>
                        </>
                      )}

                      {/* Paused Actions */}
                      {isPaused && (
                        <>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'resume')}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                            style={{ background: 'var(--accent-success)' }}
                          >
                            <Play size={12} />
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtendModalCampaign(campaign);
                              setNewEndsDate(isoToDateTimeLocal(new Date(Date.now() + 3 * 86400 * 1000).toISOString()));
                            }}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Calendar size={12} />
                            Extend
                          </button>
                        </>
                      )}

                      {/* Ended Actions */}
                      {isEnded && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setContinueModalCampaign(campaign);
                              const nowLocal = new Date();
                              setContinueStarts(isoToDateTimeLocal(nowLocal.toISOString()));
                              setContinueEnds(isoToDateTimeLocal(new Date(Date.now() + 3 * 86400 * 1000).toISOString()));
                            }}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                            style={{ background: 'var(--accent-primary)' }}
                            title="Start new instance for a new time window without altering history"
                          >
                            <Repeat size={12} />
                            Continue (New Instance)
                          </button>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'archive')}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                            style={{ borderColor: 'var(--card-border)' }}
                          >
                            <Archive size={12} />
                            Archive
                          </button>
                        </>
                      )}

                      {/* Draft Actions */}
                      {isDraft && (
                        <>
                          <button
                            type="button"
                            onClick={() => void runOperation(campaign.id, 'activate')}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                            style={{ background: 'var(--accent-primary)' }}
                          >
                            <Play size={12} />
                            Activate
                          </button>
                        </>
                      )}

                      {/* Archived Actions */}
                      {isArchived && (
                        <button
                          type="button"
                          onClick={() => void runOperation(campaign.id, 'restore')}
                          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                          style={{ borderColor: 'var(--card-border)' }}
                        >
                          Restore to Draft
                        </button>
                      )}

                      {/* Universal Actions: Duplicate, Tracking Link, History, Delete */}
                      <button
                        type="button"
                        onClick={() => void runOperation(campaign.id, 'duplicate')}
                        className="rounded-lg border p-1.5 text-xs transition-colors hover:bg-[color:var(--bg-secondary)]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Duplicate as Draft"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('tracking');
                          setLinkCampaignId(campaign.id);
                          setLinkUtmCampaign(campaign.slug);
                          setLinkName(`${campaign.name} - Meta Ads`);
                        }}
                        className="rounded-lg border p-1.5 text-xs transition-colors hover:bg-[color:var(--bg-secondary)]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Create Tracking Link"
                      >
                        <LinkIcon size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void openHistoryModal(campaign)}
                        className="rounded-lg border p-1.5 text-xs transition-colors hover:bg-[color:var(--bg-secondary)]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Audit History"
                      >
                        <History size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void openDeleteModal(campaign)}
                        className="rounded-lg border p-1.5 text-xs text-rose-500 transition-colors hover:bg-rose-500/10"
                        style={{ borderColor: 'var(--card-border)' }}
                        title="Safe Delete / Check References"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: UTM & META ADS HUB ── */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Tracking Link Generator Card */}
          <div style={cardStyle} className="space-y-4 p-5">
            <div className="border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Multi-Channel UTM & Meta Ads Link Generator
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Create attribution tracking links with query parameter encoding and fragment preservation.
              </p>
            </div>

            {/* Channel Presets */}
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Select Marketing Channel
              </label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  [
                    ['meta', 'Meta (FB/IG)'],
                    ['google', 'Google Ads'],
                    ['creator', 'Creator / Influencer'],
                    ['linkedin', 'LinkedIn'],
                    ['twitter', 'X / Twitter'],
                    ['email', 'Email Newsletter'],
                    ['custom', 'Custom'],
                  ] as const
                ).map(([ch, labelText]) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleChannelPreset(ch)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      linkChannel === ch
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'border text-[var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]'
                    }`}
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    {labelText}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Tracking Link Name
                </label>
                <input
                  placeholder="e.g. Meta Retargeting - Video 01"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Associate with Global Offer (Optional)
                </label>
                <select
                  value={linkCampaignId}
                  onChange={(e) => setLinkCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <option value="">None (Generic Marketing)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Destination Page
                </label>
                <select
                  value={linkDest}
                  onChange={(e) => setLinkDest(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <option value="/pricing">/pricing (Pricing & Checkout)</option>
                  <option value="/">/ (Landing Homepage)</option>
                  <option value="/interview-questions">/interview-questions (Practice Hub)</option>
                  <option value="/tools/ats-checker">/tools/ats-checker (Free Tool)</option>
                  <option value="/tools/questions-generator">/tools/questions-generator</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  utm_source
                </label>
                <input
                  value={linkSource}
                  onChange={(e) => setLinkSource(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  utm_medium
                </label>
                <input
                  value={linkMedium}
                  onChange={(e) => setLinkMedium(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  utm_campaign
                </label>
                <input
                  value={linkUtmCampaign}
                  onChange={(e) => setLinkUtmCampaign(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  utm_content (Ad Variant / Creator)
                </label>
                <input
                  placeholder="e.g. video_ad_01 or tech_rachit"
                  value={linkContent}
                  onChange={(e) => setLinkContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  utm_term (Audience / Keyword)
                </label>
                <input
                  placeholder="e.g. software_engineers_30d"
                  value={linkTerm}
                  onChange={(e) => setLinkTerm(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Creator ID / Handle (Optional)
                </label>
                <input
                  placeholder="e.g. creator_01"
                  value={linkCreator}
                  onChange={(e) => setLinkCreator(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>
            </div>

            {/* Meta Platform Identifiers Accordion */}
            {linkChannel === 'meta' && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Meta Ads Engine Identifiers (Optional for deep API match)
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    placeholder="Meta Campaign ID"
                    value={metaCampaignId}
                    onChange={(e) => setMetaCampaignId(e.target.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                  <input
                    placeholder="Meta AdSet ID"
                    value={metaAdsetId}
                    onChange={(e) => setMetaAdsetId(e.target.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                  <input
                    placeholder="Meta Ad ID"
                    value={metaAdId}
                    onChange={(e) => setMetaAdId(e.target.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  />
                </div>
              </div>
            )}

            {/* Generated URL Box */}
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Live Generated Tracking URL:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText(generatedPreviewUrl)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-white transition-opacity active:opacity-80"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    {copiedUrl === generatedPreviewUrl ? <Check size={12} /> : <Copy size={12} />}
                    {copiedUrl === generatedPreviewUrl ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveTrackingLink()}
                    disabled={savingLink}
                    className="rounded border px-2 py-0.5 text-xs font-semibold hover:bg-[color:var(--bg-secondary)]"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    {savingLink ? 'Saving…' : 'Save to Links List'}
                  </button>
                </div>
              </div>
              <p className="break-all font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                {generatedPreviewUrl}
              </p>
            </div>
          </div>

          {/* Saved Tracking Links Table */}
          <div style={cardStyle} className="space-y-3 p-5">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Saved Marketing Tracking Links ({trackingLinks.length})
              </h3>
            </div>

            {trackingLinks.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No tracking links saved yet. Generate one above to track acquisition campaigns.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                {trackingLinks.map((link) => (
                  <div key={link.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                          {link.channel}
                        </span>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {link.name}
                        </p>
                        {link.utm_content && (
                          <span className="text-xs text-zinc-400">· content: {link.utm_content}</span>
                        )}
                      </div>
                      <p className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {link.full_url}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void copyText(link.full_url)}
                        className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-[color:var(--bg-secondary)]"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        {copiedUrl === link.full_url ? <Check size={12} /> : <Copy size={12} />}
                        {copiedUrl === link.full_url ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={link.full_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border p-1 text-xs hover:bg-[color:var(--bg-secondary)]"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                        title="Test URL in new tab"
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        type="button"
                        onClick={() => void deleteTrackingLink(link.id)}
                        className="rounded-lg border p-1 text-xs text-rose-500 hover:bg-rose-500/10"
                        style={{ borderColor: 'var(--card-border)' }}
                        title="Delete link"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: EXTEND WINDOW ── */}
      {extendModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div style={cardStyle} className="w-full max-w-md space-y-4 p-6">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Extend Window: {extendModalCampaign.name}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Extends the end timestamp of this exact campaign instance without creating a duplicate record or altering attribution snapshots.
            </p>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                New End Date & Time (Local)
              </label>
              <input
                type="datetime-local"
                value={newEndsDate}
                onChange={(e) => setNewEndsDate(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtendModalCampaign(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitExtend()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'var(--accent-primary)' }}
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONTINUE / RESTART ── */}
      {continueModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div style={cardStyle} className="w-full max-w-md space-y-4 p-6">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Continue Campaign: {continueModalCampaign.name}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Brings back &quot;{continueModalCampaign.name}&quot; for a new time window. This creates a fresh campaign instance while keeping all historical transaction and conversion analytics completely intact.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  New Start Date & Time (Local)
                </label>
                <input
                  type="datetime-local"
                  value={continueStarts}
                  onChange={(e) => setContinueStarts(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  New End Date & Time (Local)
                </label>
                <input
                  type="datetime-local"
                  value={continueEnds}
                  onChange={(e) => setContinueEnds(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContinueModalCampaign(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitContinue()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'var(--accent-primary)' }}
              >
                Create New Instance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE SAFETY GUARD ── */}
      {deleteModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div style={cardStyle} className="w-full max-w-md space-y-4 p-6">
            <div className="flex items-center gap-2 text-rose-500">
              <ShieldAlert size={20} />
              <h3 className="text-base font-bold">Delete Campaign Check</h3>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Attempting to delete &quot;{deleteModalCampaign.name}&quot; (ID: #{deleteModalCampaign.id.slice(0, 8)}).
            </p>

            {deleteSafety === null ? (
              <p className="text-xs text-zinc-400">Verifying financial references in payments table…</p>
            ) : deleteSafety.canDelete ? (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400">
                <p className="font-semibold">Safe to delete:</p>
                <p>0 payment transactions reference this campaign. It can be permanently deleted.</p>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">
                <p className="font-semibold">Permanent deletion blocked:</p>
                <p>
                  {deleteSafety.count} payment record(s) are linked to this offer. Hard deletion is forbidden to protect financial reconciliation.
                </p>
                <p className="mt-2 font-medium">Please Archive this campaign instead to hide it from operational views.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalCampaign(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Cancel
              </button>

              {deleteSafety?.canDelete ? (
                <button
                  type="button"
                  onClick={() => void confirmDelete()}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const c = deleteModalCampaign;
                    setDeleteModalCampaign(null);
                    void runOperation(c.id, 'archive');
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Archive Instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: AUDIT HISTORY ── */}
      {historyModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div style={cardStyle} className="w-full max-w-lg space-y-4 p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Audit History: {historyModalCampaign.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Immutable log of all operational mutations on this campaign.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalCampaign(null)}
                className="rounded border px-2 py-0.5 text-xs font-semibold"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {auditLoading ? (
                <p className="py-6 text-center text-xs text-zinc-400">Loading audit history…</p>
              ) : auditLogs.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">No audit records found for this campaign.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border p-2.5 text-xs"
                    style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-violet-400">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(log.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {Object.keys(log.details || {}).length > 0 && (
                      <pre className="mt-1 overflow-x-auto text-[10px] text-zinc-400 font-mono">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
