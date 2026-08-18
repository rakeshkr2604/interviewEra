'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';

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
  is_active: boolean;
  discount_type: 'percent' | 'flat_paise';
  discount_value: number;
  applies_to_plans: PaidPlanId[];
  starts_at: string;
  ends_at: string;
  display_label: string | null;
  display_badge: string | null;
};

function dateInputToIso(dateStr: string): string | null {
  if (!dateStr.trim()) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function selectedPlans(starter: boolean, pro: boolean): PaidPlanId[] {
  const plans: PaidPlanId[] = [];
  if (starter) plans.push('starter');
  if (pro) plans.push('pro');
  return plans;
}

function campaignPhase(c: PricingCampaign, now: number): 'current' | 'upcoming' | 'ended' {
  const start = Date.parse(c.starts_at);
  const end = Date.parse(c.ends_at);
  if (c.is_active && start <= now && now < end) return 'current';
  if (c.is_active && now < start) return 'upcoming';
  return 'ended';
}

function pricePreview(
  plan: PaidPlanId,
  discountType: 'percent' | 'flat_paise',
  discountValue: number,
): string {
  const config = getPaidPlan(plan);
  const quote = computeCampaignDiscountQuote({
    listAmountPaise: config.amountPaise,
    promoFloorPaise: config.promoFloorPaise,
    discountType,
    discountValue,
  });
  if (!quote.ok) return `${config.label}: invalid`;
  return `${config.label}: ₹${Math.round(quote.final_amount_paise / 100)}`;
}

export function GlobalOffersPanel() {
  const [campaigns, setCampaigns] = useState<PricingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Limited Time Offer');
  const [discountType, setDiscountType] = useState<'percent' | 'flat_paise'>('percent');
  const [discountValue, setDiscountValue] = useState(20);
  const [starter, setStarter] = useState(true);
  const [pro, setPro] = useState(true);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [badge, setBadge] = useState('LIMITED TIME OFFER');
  const [label, setLabel] = useState('20% OFF');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
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

  useEffect(() => {
    void load();
  }, [load]);

  async function createCampaign() {
    const startsAt = dateInputToIso(starts);
    const endsAt = dateInputToIso(ends);
    if (!startsAt || !endsAt) {
      toast.error('Start and end are required.');
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
          name,
          discount_type: discountType,
          discount_value: discountValue,
          applies_to_plans: applies,
          starts_at: startsAt,
          ends_at: endsAt,
          display_badge: badge || null,
          display_label: label || null,
          is_active: false,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to create campaign');
      toast.success('Draft campaign created');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  }

  async function setActive(campaign: PricingCampaign, isActive: boolean) {
    const action = isActive ? 'activate' : 'deactivate';
    const confirmed = window.confirm(
      isActive
        ? `Activate “${campaign.name}”? Public pricing and checkout will change for all eligible users.`
        : `Deactivate “${campaign.name}”? Public pricing will return to list prices when no other live campaign applies.`,
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/pricing-campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(json.error ?? `Failed to ${action}`);
      return;
    }
    toast.success(isActive ? 'Campaign activated' : 'Campaign deactivated');
    await load();
  }

  const now = Date.now();
  const current = campaigns.filter((c) => campaignPhase(c, now) === 'current');
  const upcoming = campaigns.filter((c) => campaignPhase(c, now) === 'upcoming');
  const ended = campaigns.filter((c) => campaignPhase(c, now) === 'ended');

  return (
    <div className="space-y-5">
      <div style={cardStyle} className="space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Create campaign
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          />
          <div className="flex gap-2">
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
              <option value="percent">Percent</option>
              <option value="flat_paise">Flat paise</option>
            </select>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
              Starter
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
              Pro
            </label>
          </div>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Start (local)
            <input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
            End (local)
            <input
              type="datetime-local"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
          </label>
          <input
            placeholder="Badge"
            value={badge}
            onChange={(e) => setBadge(e.target.value.toUpperCase())}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          />
          <input
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Preview {pricePreview('starter', discountType, discountValue)} ·{' '}
          {pricePreview('pro', discountType, discountValue)}
        </p>
        <button
          type="button"
          onClick={() => void createCampaign()}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent-primary)' }}
        >
          {saving ? 'Saving…' : 'Create campaign'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading campaigns…
        </p>
      ) : (
        ([
          ['Current', current],
          ['Upcoming', upcoming],
          ['Inactive / ended', ended],
        ] as const).map(([title, rows]) => (
          <div key={title} style={cardStyle} className="space-y-3 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {title}
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                None
              </p>
            ) : (
              rows.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {campaign.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {campaign.discount_type === 'percent'
                        ? `${campaign.discount_value}%`
                        : `₹${Math.round(campaign.discount_value / 100)} off`}{' '}
                      · {(campaign.applies_to_plans.length ? campaign.applies_to_plans : ['starter', 'pro']).join(', ')}{' '}
                      · {new Date(campaign.starts_at).toISOString().slice(0, 16)} →{' '}
                      {new Date(campaign.ends_at).toISOString().slice(0, 16)} UTC
                      {campaign.display_badge ? ` · ${campaign.display_badge}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {campaign.is_active ? (
                      <button
                        type="button"
                        onClick={() => void setActive(campaign, false)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setActive(campaign, true)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}
