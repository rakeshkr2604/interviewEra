'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Gift,
  Ticket,
  Users,
  ScrollText,
  Copy,
  Check,
  Calculator,
  Tag,
  FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';
import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import { GlobalOffersPanel } from '@/components/admin/GlobalOffersPanel';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

type Tab = 'offers' | 'codes' | 'referrals' | 'manual' | 'resume-reviews' | 'activity';

interface ResumeReviewRequest {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  resumeId: string | null;
  planTier: string;
  cycleStart: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  adminNotes: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignCode {
  id: string;
  code: string;
  kind: 'promo' | 'sponsorship';
  label: string;
  partner_name: string | null;
  discount_type: 'percent' | 'flat_paise';
  discount_value: number;
  max_redemptions: number | null;
  redemption_count: number;
  is_active: boolean;
  applies_to_plans: PaidPlanId[];
  starts_at: string | null;
  expires_at: string | null;
}

interface RewardsStats {
  active_codes: number;
  referral_credits_granted: number;
  manual_credits_granted: number;
  redemptions_this_week: number;
}

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex items-center rounded p-1 opacity-70 hover:opacity-100"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success('Copied to clipboard');
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Could not copy');
        }
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function KindBadge({ kind }: { kind: 'promo' | 'sponsorship' }) {
  const isPromo = kind === 'promo';
  return (
    <span
      className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold capitalize"
      style={{
        background: isPromo
          ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
          : 'color-mix(in srgb, #0d9488 16%, transparent)',
        color: isPromo ? 'var(--accent-primary)' : '#0f766e',
      }}
    >
      {kind}
    </span>
  );
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';
  return `Expires ${new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateInputToIso(dateStr: string): string | null {
  if (!dateStr.trim()) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function selectedPlans(value: 'both' | PaidPlanId): PaidPlanId[] {
  return value === 'both' ? [] : [value];
}

function campaignPricePreview(
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
  return quote.ok
    ? `${config.label}: ₹${config.amountInr} → ₹${quote.final_amount_paise / 100}`
    : `${config.label}: invalid (${quote.error_code})`;
}

export default function PlatformRewardsPage() {
  const [tab, setTab] = useState<Tab>('codes');
  const [codes, setCodes] = useState<CampaignCode[]>([]);
  const [referrals, setReferrals] = useState<Array<Record<string, unknown>>>([]);
  const [activity, setActivity] = useState<Array<Record<string, unknown>>>([]);
  const [stats, setStats] = useState<RewardsStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form
  const [newCode, setNewCode] = useState('');
  const [newKind, setNewKind] = useState<'promo' | 'sponsorship'>('promo');
  const [newLabel, setNewLabel] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percent' | 'flat_paise'>('percent');
  const [newDiscountValue, setNewDiscountValue] = useState(10);
  const [newPlan, setNewPlan] = useState<'both' | PaidPlanId>('both');
  const [newMax, setNewMax] = useState('');
  const [newStarts, setNewStarts] = useState('');
  const [newExpires, setNewExpires] = useState('');

  // Edit panel
  const [editing, setEditing] = useState<CampaignCode | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'percent' | 'flat_paise'>('percent');
  const [editDiscountValue, setEditDiscountValue] = useState(10);
  const [editPlan, setEditPlan] = useState<'both' | PaidPlanId>('both');
  const [editMax, setEditMax] = useState('');
  const [editStarts, setEditStarts] = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Test quote
  const [quotePlan, setQuotePlan] = useState<'starter' | 'pro'>('starter');
  const [quoteCode, setQuoteCode] = useState('');
  const [quoteResult, setQuoteResult] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  // Manual grant
  const MAX_MANUAL_CREDIT_GRANT = 30;
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState(1);
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);

  // Manual plan tier change (same email field as the credit grant above)
  const [tierTarget, setTierTarget] = useState<'free' | 'starter' | 'pro'>('starter');
  const [tierReason, setTierReason] = useState('');
  const [changingTier, setChangingTier] = useState(false);

  // Settings
  const [referrerCredits, setReferrerCredits] = useState(1);
  const [referredCredits, setReferredCredits] = useState(1);

  // Resume review requests (Starter/Pro perk fulfillment queue)
  const [resumeReviews, setResumeReviews] = useState<ResumeReviewRequest[]>([]);
  const [resumeReviewStatusFilter, setResumeReviewStatusFilter] = useState<
    'pending' | 'scheduled' | 'completed' | 'cancelled' | 'all'
  >('pending');
  const [resumeReviewUpdatingId, setResumeReviewUpdatingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/admin/rewards-stats');
    if (!res.ok) return;
    const json = (await res.json()) as RewardsStats;
    setStats(json);
  }, []);

  const loadCodes = useCallback(async () => {
    const res = await fetch('/api/admin/campaign-codes');
    if (!res.ok) throw new Error('Failed to load codes');
    const json = (await res.json()) as { codes: CampaignCode[] };
    setCodes(json.codes);
  }, []);

  const loadReferrals = useCallback(async () => {
    const res = await fetch('/api/admin/referrals?limit=30');
    if (!res.ok) throw new Error('Failed to load referrals');
    const json = (await res.json()) as {
      referrals: Array<Record<string, unknown>>;
      settings: { referrer_credits: number; referred_credits: number };
    };
    setReferrals(json.referrals);
    setReferrerCredits(json.settings.referrer_credits);
    setReferredCredits(json.settings.referred_credits);
  }, []);

  const loadActivity = useCallback(async () => {
    const res = await fetch('/api/admin/reward-activity?limit=50');
    if (!res.ok) throw new Error('Failed to load activity');
    const json = (await res.json()) as { events: Array<Record<string, unknown>> };
    setActivity(json.events);
  }, []);

  const loadResumeReviews = useCallback(async () => {
    const res = await fetch(`/api/admin/resume-reviews?status=${resumeReviewStatusFilter}&limit=50`);
    if (!res.ok) throw new Error('Failed to load resume review requests');
    const json = (await res.json()) as { requests: ResumeReviewRequest[] };
    setResumeReviews(json.requests);
  }, [resumeReviewStatusFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadStats();
      if (tab === 'codes') await loadCodes();
      else if (tab === 'referrals') await loadReferrals();
      else if (tab === 'activity') await loadActivity();
      else if (tab === 'resume-reviews') await loadResumeReviews();
      else if (tab === 'manual') {
        const res = await fetch('/api/admin/reward-settings');
        if (res.ok) {
          const json = (await res.json()) as {
            settings: { referrer_credits: number; referred_credits: number };
          };
          setReferrerCredits(json.settings.referrer_credits);
          setReferredCredits(json.settings.referred_credits);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [tab, loadCodes, loadReferrals, loadActivity, loadResumeReviews, loadStats]);

  async function updateResumeReviewStatus(
    id: string,
    patch: { status?: ResumeReviewRequest['status']; adminNotes?: string },
  ) {
    setResumeReviewUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/resume-reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { request?: ResumeReviewRequest; error?: string };
      if (!res.ok || !json.request) throw new Error(json.error ?? 'Update failed');
      if (patch.status && patch.status !== resumeReviewStatusFilter && resumeReviewStatusFilter !== 'all') {
        setResumeReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        setResumeReviews((prev) => prev.map((r) => (r.id === id ? json.request! : r)));
      }
      toast.success('Request updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setResumeReviewUpdatingId(null);
    }
  }

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openEdit(c: CampaignCode) {
    setEditing(c);
    setEditLabel(c.label);
    setEditDiscountType(c.discount_type);
    setEditDiscountValue(c.discount_value);
    setEditPlan(c.applies_to_plans.length === 1 ? c.applies_to_plans[0] : 'both');
    setEditMax(c.max_redemptions != null ? String(c.max_redemptions) : '');
    setEditStarts(toDateInputValue(c.starts_at));
    setEditExpires(toDateInputValue(c.expires_at));
    setEditActive(c.is_active);
  }

  async function createCode() {
    const res = await fetch('/api/admin/campaign-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newCode,
        kind: newKind,
        label: newLabel || newCode,
        partner_name: newKind === 'sponsorship' ? newPartner : null,
        discount_type: newDiscountType,
        discount_value: newDiscountValue,
        applies_to_plans: selectedPlans(newPlan),
        max_redemptions: newMax ? parseInt(newMax, 10) : null,
        starts_at: dateInputToIso(newStarts),
        expires_at: dateInputToIso(newExpires),
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(json.error ?? 'Create failed');
      return;
    }
    toast.success('Code created');
    setNewCode('');
    setNewLabel('');
    setNewPartner('');
    setNewPlan('both');
    setNewMax('');
    setNewStarts('');
    setNewExpires('');
    await loadCodes();
    await loadStats();
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/campaign-codes/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editLabel.trim() || editing.code,
          discount_type: editDiscountType,
          discount_value: editDiscountValue,
          applies_to_plans: selectedPlans(editPlan),
          max_redemptions: editMax ? parseInt(editMax, 10) : null,
          starts_at: dateInputToIso(editStarts),
          expires_at: dateInputToIso(editExpires),
          is_active: editActive,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? 'Save failed');
        return;
      }
      toast.success('Code updated');
      setEditing(null);
      await loadCodes();
      await loadStats();
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    const res = await fetch(`/api/admin/campaign-codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    if (!res.ok) {
      toast.error('Update failed');
      return;
    }
    toast.success(is_active ? 'Activated' : 'Deactivated');
    await loadCodes();
    await loadStats();
  }

  async function runTestQuote() {
    setQuoting(true);
    setQuoteResult(null);
    try {
      const res = await fetch('/api/admin/campaign-codes/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: quotePlan, code: quoteCode.trim() }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        error_code?: string;
        list_amount_paise?: number;
        discount_paise?: number;
        final_amount_paise?: number;
        label?: string;
        kind?: string;
      };
      if (!res.ok) {
        setQuoteResult(json.error ?? 'Quote failed');
        toast.error(json.error ?? 'Quote failed');
        return;
      }
      if (!json.ok) {
        const msg = `${json.error_code ?? 'INVALID'}: ${json.error ?? 'Rejected'}`;
        setQuoteResult(msg);
        toast.error(msg);
        return;
      }
      const list = ((json.list_amount_paise ?? 0) / 100).toFixed(0);
      const disc = ((json.discount_paise ?? 0) / 100).toFixed(0);
      const final = ((json.final_amount_paise ?? 0) / 100).toFixed(0);
      const msg = `Valid (${json.kind ?? 'code'}${json.label ? ` · ${json.label}` : ''}): ₹${list} − ₹${disc} = ₹${final}`;
      setQuoteResult(msg);
      toast.success('Quote OK');
    } finally {
      setQuoting(false);
    }
  }

  async function grantCredits() {
    const email = grantEmail.trim().toLowerCase();
    const reason = grantReason.trim();
    if (!email) {
      toast.error('Enter the user’s email first');
      return;
    }
    if (!Number.isInteger(grantAmount) || grantAmount < 1 || grantAmount > MAX_MANUAL_CREDIT_GRANT) {
      toast.error(`Amount must be between 1 and ${MAX_MANUAL_CREDIT_GRANT}`);
      return;
    }
    if (reason.length < 3) {
      toast.error('Reason is required (at least 3 characters)');
      return;
    }
    setGranting(true);
    try {
      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: grantAmount, reason }),
      });
      const json = (await res.json()) as { error?: string; user?: { credits_remaining: number } };
      if (!res.ok) {
        toast.error(json.error ?? 'Grant failed');
        return;
      }
      toast.success(`Granted ${grantAmount} credit(s). Balance: ${json.user?.credits_remaining}`);
      setGrantReason('');
      await loadStats();
    } catch {
      toast.error('Grant failed — network error');
    } finally {
      setGranting(false);
    }
  }

  async function changeTier() {
    const email = grantEmail.trim().toLowerCase();
    const reason = tierReason.trim();
    if (!email) {
      toast.error('Enter the user’s email first');
      return;
    }
    if (reason.length < 3) {
      toast.error('Reason is required (at least 3 characters)');
      return;
    }
    setChangingTier(true);
    try {
      const res = await fetch('/api/admin/users/plan-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: tierTarget, reason }),
      });
      const json = (await res.json()) as {
        error?: string;
        warning?: string;
        noop?: boolean;
        user?: { plan_tier: string; credits_remaining: number; plan_expires_at: string | null };
      };
      if (!res.ok) {
        toast.error(json.error ?? 'Plan tier change failed');
        return;
      }
      if (json.noop) {
        toast('Already on Free tier — nothing to change.');
        return;
      }
      if (json.warning) {
        toast.warning(json.warning);
      } else {
        toast.success(
          `Plan tier set to ${json.user?.plan_tier}. Balance: ${json.user?.credits_remaining}`,
        );
      }
      setTierReason('');
      await loadStats();
    } catch {
      toast.error('Plan tier change failed — network error');
    } finally {
      setChangingTier(false);
    }
  }

  async function saveSettings() {
    const res = await fetch('/api/admin/reward-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer_credits: referrerCredits,
        referred_credits: referredCredits,
      }),
    });
    if (!res.ok) {
      toast.error('Failed to save settings');
      return;
    }
    toast.success('Referral reward settings saved');
  }

  const tabs: { id: Tab; label: string; icon: typeof Gift }[] = [
    { id: 'offers', label: 'Global offers', icon: Tag },
    { id: 'codes', label: 'Codes', icon: Ticket },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'manual', label: 'Manual credit', icon: Gift },
    { id: 'resume-reviews', label: 'Resume reviews', icon: FileSearch },
    { id: 'activity', label: 'Usage log', icon: ScrollText },
  ];

  const statItems = [
    { label: 'Active codes', value: stats?.active_codes ?? '—' },
    { label: 'Referral credits granted', value: stats?.referral_credits_granted ?? '—' },
    { label: 'Manual credits granted', value: stats?.manual_credits_granted ?? '—' },
    { label: 'Redemptions this week', value: stats?.redemptions_this_week ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Rewards
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Promo codes, sponsorships, global sale campaigns, referrals, and manual credit grants
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((s) => (
          <div key={s.label} style={cardStyle} className="px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{
              borderColor: tab === id ? 'var(--accent-primary)' : 'var(--card-border)',
              background:
                tab === id
                  ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                  : 'transparent',
              color: 'var(--text-primary)',
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'offers' && <GlobalOffersPanel />}

      {tab === 'codes' && (
        <div className="space-y-5">
          <div style={cardStyle} className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Create code
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                placeholder="CODE"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="rounded-lg border px-3 py-2 font-mono text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as 'promo' | 'sponsorship')}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <option value="promo">Promo</option>
                <option value="sponsorship">Sponsorship</option>
              </select>
              <input
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
              {newKind === 'sponsorship' && (
                <input
                  placeholder="Partner name"
                  value={newPartner}
                  onChange={(e) => setNewPartner(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
              )}
              <select
                value={newDiscountType}
                onChange={(e) => setNewDiscountType(e.target.value as 'percent' | 'flat_paise')}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <option value="percent">Percent off</option>
                <option value="flat_paise">Flat (paise)</option>
              </select>
              <input
                type="number"
                min={0}
                max={newDiscountType === 'percent' ? 50 : undefined}
                value={newDiscountValue}
                onChange={(e) => setNewDiscountValue(parseInt(e.target.value, 10) || 0)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as 'both' | PaidPlanId)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <option value="both">Starter + Pro</option>
                <option value="starter">Starter only</option>
                <option value="pro">Pro only</option>
              </select>
              <input
                placeholder="Max uses (optional)"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Start (optional)
                <input
                  type="datetime-local"
                  value={newStarts}
                  onChange={(e) => setNewStarts(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                End (optional)
                <input
                  type="datetime-local"
                  value={newExpires}
                  onChange={(e) => setNewExpires(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {newPlan !== 'pro' && campaignPricePreview('starter', newDiscountType, newDiscountValue)}
              {newPlan === 'both' ? ' · ' : ''}
              {newPlan !== 'starter' && campaignPricePreview('pro', newDiscountType, newDiscountValue)}
            </p>
            <button
              type="button"
              onClick={() => void createCode()}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--card-border)' }}
            >
              Create
            </button>
          </div>

          <div style={cardStyle} className="space-y-3 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              <Calculator className="h-3.5 w-3.5" />
              Test Quote
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Calls quote_campaign_discount only — does not reserve a redemption.
            </p>
            <div className="flex flex-wrap gap-3">
              <select
                value={quotePlan}
                onChange={(e) => setQuotePlan(e.target.value as 'starter' | 'pro')}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
              <input
                placeholder="CODE"
                value={quoteCode}
                onChange={(e) => setQuoteCode(e.target.value.toUpperCase())}
                className="rounded-lg border px-3 py-2 font-mono text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
              <button
                type="button"
                disabled={quoting || !quoteCode.trim()}
                onClick={() => void runTestQuote()}
                className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: 'var(--card-border)' }}
              >
                {quoting ? 'Quoting…' : 'Quote'}
              </button>
            </div>
            {quoteResult && (
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {quoteResult}
              </p>
            )}
          </div>

          {editing && (
            <div style={cardStyle} className="space-y-3 border-2 p-5" >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Edit <span className="font-mono">{editing.code}</span>
                </h2>
                <button
                  type="button"
                  className="text-xs underline"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input
                  placeholder="Label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
                <select
                  value={editDiscountType}
                  onChange={(e) => setEditDiscountType(e.target.value as 'percent' | 'flat_paise')}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <option value="percent">Percent off</option>
                  <option value="flat_paise">Flat (paise)</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={editDiscountType === 'percent' ? 50 : undefined}
                  value={editDiscountValue}
                  onChange={(e) => setEditDiscountValue(parseInt(e.target.value, 10) || 0)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as 'both' | PaidPlanId)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <option value="both">Starter + Pro</option>
                  <option value="starter">Starter only</option>
                  <option value="pro">Pro only</option>
                </select>
                <input
                  placeholder="Max uses (blank = ∞)"
                  value={editMax}
                  onChange={(e) => setEditMax(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                />
                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Start (blank = immediate)
                  <input
                    type="datetime-local"
                    value={editStarts}
                    onChange={(e) => setEditStarts(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  End (blank = none)
                  <input
                    type="datetime-local"
                    value={editExpires}
                    onChange={(e) => setEditExpires(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                  />
                  Active
                </label>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {editPlan !== 'pro' && campaignPricePreview('starter', editDiscountType, editDiscountValue)}
                {editPlan === 'both' ? ' · ' : ''}
                {editPlan !== 'starter' && campaignPricePreview('pro', editDiscountType, editDiscountValue)}
              </p>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void saveEdit()}
                className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: 'var(--card-border)' }}
              >
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          )}

          <div style={cardStyle} className="overflow-x-auto p-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Kind</th>
                  <th className="pb-2 pr-3">Partner</th>
                  <th className="pb-2 pr-3">Plan</th>
                  <th className="pb-2 pr-3">Discount</th>
                  <th className="pb-2 pr-3">Used / Max</th>
                  <th className="pb-2 pr-3">Expiry</th>
                  <th className="pb-2 pr-3">Active</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold">
                        {c.code}
                        <CopyTextButton text={c.code} label="Copy code" />
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <KindBadge kind={c.kind} />
                    </td>
                    <td className="py-2 pr-3" style={{ color: 'var(--text-muted)' }}>
                      {c.partner_name ?? '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {c.applies_to_plans.length === 0
                        ? 'Both'
                        : c.applies_to_plans.map((plan) => getPaidPlan(plan).label).join(', ')}
                    </td>
                    <td className="py-2 pr-3">
                      {c.discount_type === 'percent'
                        ? `${c.discount_value}%`
                        : `₹${(c.discount_value / 100).toFixed(0)}`}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {c.redemption_count} / {c.max_redemptions != null ? c.max_redemptions : '∞'}
                    </td>
                    <td className="py-2 pr-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatExpiry(c.expires_at)}
                    </td>
                    <td className="py-2 pr-3">{c.is_active ? 'yes' : 'no'}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs underline"
                          style={{ color: 'var(--accent-primary)' }}
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs underline"
                          style={{ color: 'var(--accent-primary)' }}
                          onClick={() => void toggleActive(c.id, !c.is_active)}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-4" style={{ color: 'var(--text-muted)' }}>
                      No codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'referrals' && (
        <div style={cardStyle} className="overflow-x-auto p-5">
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              Referrer credits
              <input
                type="number"
                min={0}
                max={100}
                value={referrerCredits}
                onChange={(e) => setReferrerCredits(parseInt(e.target.value, 10) || 0)}
                className="w-16 rounded border px-2 py-1"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
            </label>
            <label className="flex items-center gap-2">
              Referred credits
              <input
                type="number"
                min={0}
                max={100}
                value={referredCredits}
                onChange={(e) => setReferredCredits(parseInt(e.target.value, 10) || 0)}
                className="w-16 rounded border px-2 py-1"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              />
            </label>
            <button
              type="button"
              onClick={() => void saveSettings()}
              className="rounded-lg border px-3 py-1 text-sm font-medium"
              style={{ borderColor: 'var(--card-border)' }}
            >
              Save settings
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 pr-3">Referrer</th>
                <th className="pb-2 pr-3">Referral link</th>
                <th className="pb-2 pr-3">Referred</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Credits</th>
                <th className="pb-2">Credited at</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => {
                const shareUrl = r.referrer_share_url ? String(r.referrer_share_url) : null;
                const code = r.referrer_code ? String(r.referrer_code) : null;
                return (
                  <tr key={String(r.id)} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="py-2 pr-3">{String(r.referrer_email ?? '—')}</td>
                    <td className="py-2 pr-3">
                      {shareUrl && code ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs">
                          {code}
                          <CopyTextButton text={shareUrl} label="Copy referral link" />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-3">{String(r.referred_email ?? '—')}</td>
                    <td className="py-2 pr-3">{String(r.status)}</td>
                    <td className="py-2 pr-3 tabular-nums">{String(r.credits_granted)}</td>
                    <td className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.credited_at
                        ? new Date(String(r.credited_at)).toLocaleString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4" style={{ color: 'var(--text-muted)' }}>
                    No referrals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'manual' && (
        <div className="max-w-lg space-y-4">
          <div style={cardStyle} className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Target user
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Shared by both actions below — credit grant and plan tier change.
            </p>
            <input
              type="email"
              placeholder="user@email.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
          </div>

          <div style={cardStyle} className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Grant credits
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Writes through add_credit → credit_transactions. {MAX_MANUAL_CREDIT_GRANT} credits max per grant, positive only.
            </p>
            <input
              type="number"
              min={1}
              max={MAX_MANUAL_CREDIT_GRANT}
              value={grantAmount}
              onChange={(e) =>
                setGrantAmount(
                  Math.min(
                    MAX_MANUAL_CREDIT_GRANT,
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                  ),
                )
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
            <input
              placeholder="Reason (required, min 3 characters)"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
            <button
              type="button"
              disabled={granting}
              onClick={() => void grantCredits()}
              className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {granting ? 'Granting…' : 'Grant'}
            </button>
          </div>

          <div style={cardStyle} className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Change plan tier
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Starter/Pro grants that plan&rsquo;s credits and extends (or starts) its billing
              cycle, same as a real purchase. Setting Free zeroes remaining credits and ends the
              plan — use to revert a mistaken grant. Campus/workspace plans are not editable here.
            </p>
            <select
              value={tierTarget}
              onChange={(e) => setTierTarget(e.target.value as 'free' | 'starter' | 'pro')}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <option value="free">Free</option>
              <option value="starter">
                Starter (+{getPaidPlan('starter').credits} credits, {getPaidPlan('starter').durationDays}d)
              </option>
              <option value="pro">
                Pro (+{getPaidPlan('pro').credits} credits, {getPaidPlan('pro').durationDays}d)
              </option>
            </select>
            <input
              placeholder="Reason (required, min 3 characters)"
              value={tierReason}
              onChange={(e) => setTierReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            />
            <button
              type="button"
              disabled={changingTier}
              onClick={() => void changeTier()}
              className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {changingTier ? 'Updating…' : 'Change tier'}
            </button>
          </div>
        </div>
      )}

      {tab === 'resume-reviews' && (
        <div style={cardStyle} className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Resume review requests
              </h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Starter (1) / Pro (2) per billing cycle. Fulfill from here — status changes are visible to the
                candidate on their request page.
              </p>
            </div>
            <select
              value={resumeReviewStatusFilter}
              onChange={(e) =>
                setResumeReviewStatusFilter(
                  e.target.value as typeof resumeReviewStatusFilter,
                )
              }
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>

          {resumeReviews.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No {resumeReviewStatusFilter === 'all' ? '' : resumeReviewStatusFilter} requests.
            </p>
          ) : (
            <div className="space-y-3">
              {resumeReviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {r.userName || r.userEmail || r.userId}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.userEmail} · {r.planTier} · requested {formatDateTimeEnIn(r.createdAt)}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  {r.notes ? (
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      &ldquo;{r.notes}&rdquo;
                    </p>
                  ) : null}
                  {r.resumeId ? (
                    <a
                      href={`/api/admin/resume-reviews/${r.id}/resume-file`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-semibold underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Open attached resume
                    </a>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        disabled={resumeReviewUpdatingId === r.id}
                        onClick={() => void updateResumeReviewStatus(r.id, { status: 'scheduled' })}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        Mark scheduled
                      </button>
                    )}
                    {(r.status === 'pending' || r.status === 'scheduled') && (
                      <button
                        type="button"
                        disabled={resumeReviewUpdatingId === r.id}
                        onClick={() => void updateResumeReviewStatus(r.id, { status: 'completed' })}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        Mark completed
                      </button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'completed' && (
                      <button
                        type="button"
                        disabled={resumeReviewUpdatingId === r.id}
                        onClick={() => void updateResumeReviewStatus(r.id, { status: 'cancelled' })}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-(--accent-danger) disabled:opacity-50"
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        Cancel (frees quota slot)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div style={cardStyle} className="overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">User</th>
                <th className="pb-2 pr-3">Code</th>
                <th className="pb-2 pr-3">Detail</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((e) => (
                <tr key={String(e.id)} style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(String(e.created_at)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 pr-3">{String(e.type)}</td>
                  <td className="py-2 pr-3">{String(e.user_email ?? '—')}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{String(e.code_or_label ?? '—')}</td>
                  <td className="py-2 pr-3 text-xs">{String(e.detail)}</td>
                  <td className="py-2">{String(e.status)}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4" style={{ color: 'var(--text-muted)' }}>
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
