'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  CampusApprovalListResponse,
  CampusApprovalRow,
  CampusApprovalStatus,
} from '@/lib/admin/campus-approvals';

const TABS: Array<{ value: CampusApprovalStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1.5px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

function StatusBadge({ status }: { status: CampusApprovalRow['verificationStatus'] }) {
  const styles = {
    pending: {
      bg: 'color-mix(in srgb, var(--accent-warning) 15%, transparent)',
      fg: 'var(--accent-warning)',
    },
    approved: {
      bg: 'color-mix(in srgb, var(--accent-success) 15%, transparent)',
      fg: 'var(--accent-success)',
    },
    rejected: {
      bg: 'color-mix(in srgb, var(--accent-danger) 15%, transparent)',
      fg: 'var(--accent-danger)',
    },
  }[status];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ background: styles.bg, color: styles.fg }}
    >
      {status}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </dt>
      <dd className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
        {value || 'Not collected'}
      </dd>
    </div>
  );
}

export function CampusApprovalsDashboard() {
  const [status, setStatus] = useState<CampusApprovalStatus>('pending');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<CampusApprovalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CampusApprovalRow | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        pageSize: '10',
      });
      if (search) params.set('search', search);
      const response = await fetch(`/api/platform/campus-organizations?${params}`, {
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Failed to load campus organizations.');
      setData(body);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load campus organizations.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectStatus(next: CampusApprovalStatus) {
    setStatus(next);
    setPage(1);
    setSelected(null);
  }

  function applySearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function openDecision(action: 'approved' | 'rejected') {
    setReason('');
    setDecision(action);
  }

  async function submitDecision() {
    if (!selected || !decision || submitting) return;
    if (decision === 'rejected' && reason.trim().length < 3) {
      toast.error('Enter a rejection reason (at least 3 characters).');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/platform/campus-organizations/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          decision === 'approved'
            ? { action: 'approved' }
            : { action: 'rejected', reason: reason.trim() },
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Review failed.');
      toast.success(
        decision === 'approved'
          ? 'Campus organization approved.'
          : 'Campus organization rejected.',
      );
      setDecision(null);
      setSelected(null);
      await load();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Review failed.');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6" style={{ color: 'var(--accent-primary)' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Campus Organization Approvals
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Review and approve campus organizations before granting full campus access.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Campus organization status">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => selectStatus(tab.value)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{
              borderColor: status === tab.value ? 'var(--accent-primary)' : 'var(--card-border)',
              background:
                status === tab.value
                  ? 'color-mix(in srgb, var(--accent-primary) 13%, transparent)'
                  : 'var(--card-bg)',
              color: status === tab.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
            <span className="ml-2 tabular-nums">{data?.counts[tab.value] ?? '—'}</span>
          </button>
        ))}
      </div>

      {data?.warning ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: 'var(--accent-warning)',
            background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
            color: 'var(--text-primary)',
          }}
          role="alert"
        >
          {data.warning}
        </div>
      ) : null}

      <form onSubmit={applySearch} className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search organization, coordinator, or contact email"
            className="pl-8"
            maxLength={100}
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {error ? (
        <div style={cardStyle} className="p-8 text-center">
          <XCircle className="mx-auto mb-3 size-8" style={{ color: 'var(--accent-danger)' }} />
          <p className="font-semibold">Could not load approvals</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} style={cardStyle} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : !data?.organizations.length ? (
        <div style={cardStyle} className="p-10 text-center">
          <Building2 className="mx-auto mb-3 size-9" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold">No organizations found</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            There are no {status === 'all' ? '' : status} campus organizations matching this search.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setSelected(org)}
              style={cardStyle}
              className="w-full p-5 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold">{org.name}</h2>
                    <StatusBadge status={org.verificationStatus} />
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {org.domain ?? 'Domain not collected'} · submitted{' '}
                    {new Date(org.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  <p className="mt-2 text-sm">
                    {org.admin?.name ?? 'Unnamed admin'} · {org.admin?.email ?? 'Admin profile unavailable'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-right text-sm">
                  <div>
                    <p className="font-bold tabular-nums">{org.memberCount}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Members</p>
                  </div>
                  <div>
                    <p className="font-bold">{org.admin?.planTier ?? '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin plan</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {data.pagination.total} organization{data.pagination.total === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm tabular-nums">
              {page} / {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= data.pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>Review organization and administrator details.</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Building2 className="size-4" /> Organization
                  </h3>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Name" value={selected.name} />
                    <DetailItem label="Domain" value={selected.domain} />
                    <DetailItem label="Contact email" value={selected.contactEmail} />
                    <DetailItem label="Coordinator" value={selected.coordinatorName} />
                    <DetailItem label="Website" value="Not collected" />
                    <DetailItem label="Organization type / location" value="Not collected" />
                    <DetailItem label="Seats" value={selected.seatCount} />
                    <DetailItem label="Members" value={selected.memberCount} />
                  </dl>
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <User className="size-4" /> Administrator
                  </h3>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Name" value={selected.admin?.name} />
                    <DetailItem label="Email" value={selected.admin?.email} />
                    <DetailItem label="Current plan" value={selected.admin?.planTier} />
                    <DetailItem
                      label="Account created"
                      value={selected.admin ? new Date(selected.admin.createdAt).toLocaleString('en-IN') : null}
                    />
                  </dl>
                </section>

                <section className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)' }}>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Users className="size-4" /> Current state
                  </h3>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="verification_status" value={<StatusBadge status={selected.verificationStatus} />} />
                    <DetailItem label="plan_tier" value={selected.admin?.planTier} />
                    <DetailItem
                      label="Submitted"
                      value={new Date(selected.createdAt).toLocaleString('en-IN')}
                    />
                    <DetailItem
                      label="Latest review"
                      value={
                        selected.latestReview
                          ? `${selected.latestReview.action} · ${new Date(selected.latestReview.createdAt).toLocaleString('en-IN')}`
                          : 'No review yet'
                      }
                    />
                  </dl>
                  {selected.latestReview?.reason ? (
                    <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Reason: {selected.latestReview.reason}
                    </p>
                  ) : null}
                </section>

                {selected.verificationStatus === 'pending' && data?.capabilities.reviewActions ? (
                  <section className="rounded-xl border p-4" style={{ borderColor: 'var(--accent-primary)' }}>
                    <h3 className="font-semibold">Approval preview</h3>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p><code>verification_status</code>: pending → approved</p>
                      <p><code>plan_tier</code>: {selected.admin?.planTier ?? 'unknown'} → campus_admin</p>
                    </div>
                  </section>
                ) : selected.verificationStatus === 'pending' ? (
                  <section
                    className="rounded-xl border p-4 text-sm"
                    style={{ borderColor: 'var(--accent-warning)' }}
                  >
                    Approval actions are unavailable until the campus review migration is installed.
                  </section>
                ) : null}
              </div>

              <DialogFooter className="mt-2">
                {selected.verificationStatus === 'pending' && data?.capabilities.reviewActions ? (
                  <>
                    <Button variant="destructive" onClick={() => openDecision('rejected')}>
                      <XCircle /> Reject
                    </Button>
                    <Button onClick={() => openDecision('approved')}>
                      <CheckCircle2 /> Approve Organization
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && !submitting && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approved' ? 'Approve organization?' : 'Reject organization?'}
            </DialogTitle>
            <DialogDescription>
              {decision === 'approved'
                ? 'You are approving this organization. This will enable campus privileges for its administrator.'
                : 'The organization will remain in the system but will not receive campus privileges.'}
            </DialogDescription>
          </DialogHeader>

          {decision === 'approved' ? (
            <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--card-border)' }}>
              <p><code>verification_status</code>: pending → approved</p>
              <p className="mt-1"><code>plan_tier</code>: {selected?.admin?.planTier ?? 'unknown'} → campus_admin</p>
            </div>
          ) : (
            <label className="space-y-2 text-sm font-medium">
              Internal rejection reason
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="Brief reason for rejection"
                disabled={submitting}
              />
              <span className="block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                Stored in the founder-only audit log. {reason.length}/500
              </span>
            </label>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={decision === 'approved' ? 'default' : 'destructive'}
              onClick={() => void submitDecision()}
              disabled={submitting || (decision === 'rejected' && reason.trim().length < 3)}
            >
              {submitting ? 'Saving…' : decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
