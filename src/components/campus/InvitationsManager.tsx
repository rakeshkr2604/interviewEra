'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Ban, Check } from 'lucide-react';
import type { CampusInviteRow, InviteStatus } from '@/lib/college/types';

const STATUS_STYLES: Record<InviteStatus, { bg: string; color: string; label: string }> = {
  pending: {
    bg: 'color-mix(in srgb, var(--accent-warning) 15%, transparent)',
    color: 'var(--accent-warning)',
    label: 'Pending',
  },
  accepted: {
    bg: 'color-mix(in srgb, var(--accent-success) 15%, transparent)',
    color: 'var(--accent-success)',
    label: 'Accepted',
  },
  expired: {
    bg: 'color-mix(in srgb, var(--text-muted) 15%, transparent)',
    color: 'var(--text-muted)',
    label: 'Expired',
  },
  revoked: {
    bg: 'color-mix(in srgb, var(--accent-danger) 15%, transparent)',
    color: 'var(--accent-danger)',
    label: 'Revoked',
  },
};

interface InvitationsManagerProps {
  invites: CampusInviteRow[];
}

export function InvitationsManager({ invites: initialInvites }: InvitationsManagerProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(inviteId: string, action: 'revoke' | 'resend') {
    setLoadingId(inviteId);
    setError(null);

    try {
      const res = await fetch('/api/college/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inviteId }),
      });
      const data = (await res.json()) as { error?: string; status?: InviteStatus };

      if (!res.ok) {
        setError(data.error ?? 'Action failed');
        return;
      }

      setInvites((prev) =>
        prev.map((inv) =>
          inv.id === inviteId
            ? {
                ...inv,
                status: data.status ?? inv.status,
                effective_status: data.status ?? inv.effective_status,
              }
            : inv
        )
      );
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoadingId(null);
    }
  }

  async function copyLink(token: string, inviteId: string) {
    const url = `${window.location.origin}/college/join/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(inviteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (invites.length === 0) return null;

  const grouped = {
    pending: invites.filter((i) => i.effective_status === 'pending'),
    accepted: invites.filter((i) => i.effective_status === 'accepted'),
    expired: invites.filter((i) => i.effective_status === 'expired'),
    revoked: invites.filter((i) => i.effective_status === 'revoked'),
  };

  return (
    <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
      <div
        className="border-b px-5 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Invitations
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {grouped.pending.length} pending · {grouped.accepted.length} accepted
        </span>
      </div>

      {error && (
        <div
          className="mx-5 mt-3 rounded-xl border px-4 py-2 text-xs"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-danger) 25%, transparent)',
            color: 'var(--accent-danger)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="text-xs uppercase tracking-wide"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          >
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Email</th>
              <th className="px-5 py-2.5 text-left font-medium">Invited</th>
              <th className="px-5 py-2.5 text-center font-medium">Status</th>
              <th className="px-5 py-2.5 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const style = STATUS_STYLES[inv.effective_status];
              const isLoading = loadingId === inv.id;
              return (
                <tr key={inv.id} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>
                    {inv.email}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(inv.invited_at).toLocaleDateString('en-IN')}
                    {inv.expires_at && inv.effective_status === 'pending' && (
                      <span className="block" style={{ color: 'var(--text-muted)' }}>
                        Expires {new Date(inv.expires_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {(inv.effective_status === 'pending' || inv.effective_status === 'expired') && (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => void copyLink(inv.token, inv.id)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                            title="Copy invite link"
                          >
                            {copiedId === inv.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => void runAction(inv.id, 'resend')}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                            Resend
                          </button>
                        </>
                      )}
                      {inv.effective_status === 'pending' && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void runAction(inv.id, 'revoke')}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--accent-danger) 25%, transparent)',
                            color: 'var(--accent-danger)',
                          }}
                        >
                          <Ban className="h-3 w-3" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
