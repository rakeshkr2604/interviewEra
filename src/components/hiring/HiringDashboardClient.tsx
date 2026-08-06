'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  UserRoundX,
  RotateCcw,
} from 'lucide-react';
import type { HiringCandidate } from '@/lib/hiring/types';
import {
  HIRING_PIPELINE_COLUMNS,
  HIRING_STAGE_LABELS,
  nextHiringStage,
  type HiringStage,
} from '@/lib/hiring/pipeline';
import { IE_FIELD_SURFACE_STYLE, IE_INPUT_CLASS } from '@/lib/theme/component-classes';

interface HiringDashboardClientProps {
  orgName: string;
  initialCandidates: HiringCandidate[];
}

export function HiringDashboardClient({
  orgName,
  initialCandidates,
}: HiringDashboardClientProps) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  const byStage = useMemo(() => {
    const map: Record<HiringStage, HiringCandidate[]> = {
      applied: [],
      ai_interview_completed: [],
      shortlisted: [],
      human_interview: [],
      offer: [],
      rejected: [],
    };
    for (const c of candidates) {
      map[c.stage]?.push(c);
    }
    return map;
  }, [candidates]);

  const stats = useMemo(
    () => ({
      total: candidates.length,
      active: candidates.filter((c) => c.stage !== 'rejected' && c.stage !== 'offer').length,
      offers: byStage.offer.length,
      rejected: byStage.rejected.length,
    }),
    [candidates, byStage],
  );

  const refreshLocal = useCallback((candidate: HiringCandidate) => {
    setCandidates((prev) => {
      const idx = prev.findIndex((c) => c.id === candidate.id);
      if (idx === -1) return [candidate, ...prev];
      const next = [...prev];
      next[idx] = candidate;
      return next;
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const res = await fetch('/api/hiring/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, roleTitle }),
      });
      const body = (await res.json()) as { error?: string; candidate?: HiringCandidate };
      if (!res.ok || !body.candidate) {
        setError(body.error ?? 'Failed to add candidate.');
        return;
      }
      setCandidates((prev) => [body.candidate!, ...prev]);
      setFullName('');
      setEmail('');
      setRoleTitle('');
      setShowAdd(false);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setAdding(false);
    }
  }

  async function moveTo(id: string, stage: HiringStage) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/hiring/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const body = (await res.json()) as { error?: string; candidate?: HiringCandidate };
      if (!res.ok || !body.candidate) {
        setError(body.error ?? 'Failed to update stage.');
        return;
      }
      refreshLocal(body.candidate);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function removeCandidate(id: string) {
    if (!window.confirm('Remove this candidate from the pipeline?')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/hiring/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to delete.');
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            Hiring Pipeline
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage candidates for {orgName} — Applied through Offer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
          style={{ background: 'var(--accent-primary)' }}
        >
          <Plus className="size-4" aria-hidden />
          Add candidate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'In pipeline', value: stats.active },
          { label: 'Offers', value: stats.offers },
          { label: 'Rejected', value: stats.rejected },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--error, #c44)' }}>
          {error}
        </p>
      ) : null}

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border p-4 sm:p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            New candidate
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className={IE_INPUT_CLASS}
              style={IE_FIELD_SURFACE_STYLE}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className={IE_INPUT_CLASS}
              style={IE_FIELD_SURFACE_STYLE}
            />
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Role (e.g. SDE Intern)"
              className={IE_INPUT_CLASS}
              style={IE_FIELD_SURFACE_STYLE}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="min-h-[40px] rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-primary)' }}
            >
              {adding ? 'Adding…' : 'Add to Applied'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="min-h-[40px] rounded-lg border px-4 text-sm font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {HIRING_PIPELINE_COLUMNS.map((stage) => (
          <div
            key={stage}
            className="flex w-[min(18rem,85vw)] shrink-0 flex-col rounded-2xl border"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <div
              className="flex items-center justify-between border-b px-3 py-2.5"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                {HIRING_STAGE_LABELS[stage]}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                {byStage[stage].length}
              </span>
            </div>
            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto p-2" role="list">
              {byStage[stage].length === 0 ? (
                <li className="px-2 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No candidates
                </li>
              ) : (
                byStage[stage].map((c) => {
                  const next = nextHiringStage(c.stage);
                  const busy = busyId === c.id;
                  return (
                    <li
                      key={c.id}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.fullName}
                      </p>
                      {c.roleTitle ? (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {c.roleTitle}
                        </p>
                      ) : null}
                      {c.score != null ? (
                        <p className="mt-1 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                          Score {c.score.toFixed(1)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {next ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => moveTo(c.id, next)}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold disabled:opacity-50"
                            style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                          >
                            Advance
                            <ArrowRight className="size-3" aria-hidden />
                          </button>
                        ) : null}
                        {c.stage !== 'rejected' && c.stage !== 'offer' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => moveTo(c.id, 'rejected')}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold disabled:opacity-50"
                            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                          >
                            <UserRoundX className="size-3" aria-hidden />
                            Reject
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeCandidate(c.id)}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold disabled:opacity-50"
                          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
                          aria-label={`Delete ${c.fullName}`}
                        >
                          <Trash2 className="size-3" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <button
          type="button"
          onClick={() => setShowRejected((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Rejected ({byStage.rejected.length})
          <span style={{ color: 'var(--text-muted)' }}>{showRejected ? 'Hide' : 'Show'}</span>
        </button>
        {showRejected ? (
          <ul className="space-y-2 border-t px-4 py-3" style={{ borderColor: 'var(--card-border)' }} role="list">
            {byStage.rejected.length === 0 ? (
              <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No rejected candidates
              </li>
            ) : (
              byStage.rejected.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {c.fullName}
                    {c.roleTitle ? ` · ${c.roleTitle}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => moveTo(c.id, 'applied')}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    Reopen to Applied
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
