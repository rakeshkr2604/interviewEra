'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
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
import {
  COACH_ACCESS_MODES,
  type CoachAccessMode,
  normalizeCoachEmail,
} from '@/lib/coach/constants';

interface CoachAccessState {
  mode: CoachAccessMode;
  allowlistCount: number;
  allowlist: string[];
}

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1.5px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

const MODE_CONFIG: Record<
  CoachAccessMode,
  {
    title: string;
    badgeLabel: string;
    shortDesc: string;
    consequence: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
  }
> = {
  disabled: {
    title: 'Disabled',
    badgeLabel: 'Disabled',
    shortDesc: 'Coach is unavailable to everyone.',
    consequence: 'All users (including administrators) will immediately lose access to AI Interview Coach.',
    color: 'var(--accent-danger, #ef4444)',
    bgColor: 'color-mix(in srgb, var(--accent-danger, #ef4444) 12%, transparent)',
    icon: XCircle,
  },
  admin_only: {
    title: 'Admin Only',
    badgeLabel: 'Admin Only',
    shortDesc: 'Only platform administrators can access Coach.',
    consequence: 'Only platform administrators will have access. Normal users and candidates will be denied with 403.',
    color: '#eab308',
    bgColor: 'color-mix(in srgb, #eab308 14%, transparent)',
    icon: Shield,
  },
  allowlist: {
    title: 'Allowlist',
    badgeLabel: 'Allowlist Preview',
    shortDesc: 'Platform administrators and explicitly allowlisted users can access Coach.',
    consequence: 'Platform administrators and verified allowlisted emails will have access. All other accounts will be denied.',
    color: 'var(--accent-primary, #6366f1)',
    bgColor: 'color-mix(in srgb, var(--accent-primary, #6366f1) 14%, transparent)',
    icon: UserCheck,
  },
  public: {
    title: 'Public',
    badgeLabel: 'Public Live',
    shortDesc: 'All authenticated users can access Coach.',
    consequence: 'All authenticated users will immediately be able to access AI Interview Coach according to standard tier quotas.',
    color: '#10b981',
    bgColor: 'color-mix(in srgb, #10b981 14%, transparent)',
    icon: CheckCircle2,
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CoachManagementDashboard() {
  const [data, setData] = useState<CoachAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mode change confirmation dialog state
  const [pendingMode, setPendingMode] = useState<CoachAccessMode | null>(null);
  const [modeSubmitting, setModeSubmitting] = useState(false);

  // Allowlist management state
  const [newEmail, setNewEmail] = useState('');
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [addEmailSubmitting, setAddEmailSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Remove email confirmation dialog state
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  // Clear allowlist confirmation dialog state
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearSubmitting, setClearSubmitting] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/coach/access', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to load Coach access configuration.');
      }
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Mode change handler
  const handleConfirmModeChange = async () => {
    if (!pendingMode || modeSubmitting) return;
    setModeSubmitting(true);
    try {
      const res = await fetch('/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode: pendingMode }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to update access mode.');
      }
      toast.success(`Access mode switched to ${MODE_CONFIG[pendingMode].title}`);
      setPendingMode(null);
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mode update failed.');
    } finally {
      setModeSubmitting(false);
    }
  };

  // Add email handler
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailValidationError(null);

    const normalized = normalizeCoachEmail(newEmail);
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      setEmailValidationError('Please enter a valid email address.');
      return;
    }

    if (data?.allowlist.includes(normalized)) {
      setEmailValidationError('This email is already in the allowlist.');
      return;
    }

    setAddEmailSubmitting(true);
    try {
      const res = await fetch('/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_emails',
          emails: [normalized],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to add email to allowlist.');
      }
      toast.success(`Added ${normalized} to allowlist`);
      setNewEmail('');
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add email.');
    } finally {
      setAddEmailSubmitting(false);
    }
  };

  // Remove email handler
  const handleConfirmRemoveEmail = async () => {
    if (!emailToRemove || removeSubmitting) return;
    setRemoveSubmitting(true);
    try {
      const res = await fetch('/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_emails',
          emails: [emailToRemove],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to remove email.');
      }
      toast.success(`Removed ${emailToRemove} from allowlist`);
      setEmailToRemove(null);
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Removal failed.');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  // Clear allowlist handler
  const handleConfirmClearAllowlist = async () => {
    if (clearSubmitting) return;
    setClearSubmitting(true);
    try {
      const res = await fetch('/api/admin/coach/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_allowlist' }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to clear allowlist.');
      }
      toast.success('Allowlist cleared successfully');
      setClearDialogOpen(false);
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear allowlist.');
    } finally {
      setClearSubmitting(false);
    }
  };

  // Filtered allowlist
  const filteredAllowlist = useMemo(() => {
    if (!data?.allowlist) return [];
    const query = searchFilter.trim().toLowerCase();
    if (!query) return data.allowlist;
    return data.allowlist.filter((email) => email.toLowerCase().includes(query));
  }, [data?.allowlist, searchFilter]);

  const currentConfig = data?.mode ? MODE_CONFIG[data.mode] : null;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-9 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Bot className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              AI Interview Coach
            </h1>
          </div>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Controlled access &amp; operational management. Control who can access AI Interview Coach without redeploying the application.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadState()}
          disabled={loading || modeSubmitting || addEmailSubmitting}
          className="gap-2"
        >
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </div>

      {/* ── Error Banner ── */}
      {error ? (
        <div
          className="flex items-center justify-between rounded-xl border p-4 text-sm"
          style={{
            borderColor: 'var(--accent-danger)',
            background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
            color: 'var(--text-primary)',
          }}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadState()}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* ── Current Status Card ── */}
      <div style={cardStyle} className="p-5 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Current Status
        </h2>

        {loading && !data ? (
          <div className="mt-4 flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw className="size-4 animate-spin" />
            Loading operational status…
          </div>
        ) : data && currentConfig ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Active Access Mode
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: currentConfig.bgColor, color: currentConfig.color }}
                >
                  <currentConfig.icon className="size-3.5" />
                  {currentConfig.badgeLabel}
                </span>
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {currentConfig.shortDesc}
              </p>
            </div>

            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Allowlisted Users
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {data.allowlistCount}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {data.mode === 'allowlist'
                  ? 'Currently granted private preview access'
                  : 'Staged for Allowlist mode'}
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Live Availability State
              </p>
              <div
                className="mt-1 rounded-lg border p-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 60%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                {data.mode === 'disabled' && (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium">
                    <Lock className="size-3.5" />
                    Coach is offline. All user and admin requests return 403.
                  </span>
                )}
                {data.mode === 'admin_only' && (
                  <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <Shield className="size-3.5" />
                    Internal demo mode. Platform admins only.
                  </span>
                )}
                {data.mode === 'allowlist' && (
                  <span className="flex items-center gap-1.5 text-indigo-500 font-medium">
                    <UserCheck className="size-3.5" />
                    Restricted cohort preview. Admins + allowlisted emails only.
                  </span>
                )}
                {data.mode === 'public' && (
                  <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                    <CheckCircle2 className="size-3.5" />
                    Public feature enabled for all authenticated accounts.
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Access Mode Selector ── */}
      <div style={cardStyle} className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Change Access Mode
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Select a target mode to stage changes. An explicit confirmation dialog will be required.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COACH_ACCESS_MODES.map((modeKey) => {
            const cfg = MODE_CONFIG[modeKey];
            const isSelected = data?.mode === modeKey;
            const Icon = cfg.icon;

            return (
              <button
                key={modeKey}
                type="button"
                disabled={loading || modeSubmitting}
                onClick={() => {
                  if (data?.mode !== modeKey) {
                    setPendingMode(modeKey);
                  }
                }}
                className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                  isSelected ? 'ring-2' : 'hover:border-[var(--accent-primary)]'
                }`}
                style={{
                  borderColor: isSelected ? cfg.color : 'var(--card-border)',
                  background: isSelected
                    ? 'color-mix(in srgb, var(--card-bg) 90%, transparent)'
                    : 'var(--card-bg)',
                  boxShadow: isSelected ? `0 0 16px ${cfg.bgColor}` : 'none',
                }}
              >
                {isSelected ? (
                  <span
                    className="absolute right-3 top-3 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: cfg.bgColor, color: cfg.color }}
                  >
                    Active
                  </span>
                ) : null}

                <div
                  className="flex size-8 items-center justify-center rounded-lg border"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: cfg.bgColor,
                    color: cfg.color,
                  }}
                >
                  <Icon className="size-4" />
                </div>

                <h3 className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {cfg.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {cfg.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Allowlist Management Section ── */}
      <div style={cardStyle} className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <Users className="size-4" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Allowlist Management
              </h2>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Individual and cohort email addresses permitted to test AI Interview Coach in private preview.
            </p>
          </div>

          {data && data.allowlistCount > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
              disabled={loading || clearSubmitting}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Clear Allowlist ({data.allowlistCount})
            </Button>
          ) : null}
        </div>

        {/* Add Email Form */}
        <form onSubmit={handleAddEmail} className="mt-5 max-w-xl space-y-2">
          <label htmlFor="allowlist-email-input" className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Add tester email
          </label>
          <div className="flex gap-2">
            <Input
              id="allowlist-email-input"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailValidationError(null);
              }}
              placeholder="colleague@interviewera.com"
              disabled={loading || addEmailSubmitting}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || addEmailSubmitting || !newEmail.trim()}
              className="gap-1.5"
            >
              <Plus className={addEmailSubmitting ? 'size-4 animate-spin' : 'size-4'} />
              Add User
            </Button>
          </div>
          {emailValidationError ? (
            <p className="text-xs text-red-500 font-medium">{emailValidationError}</p>
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Emails are automatically trimmed and normalized to lowercase before saving.
            </p>
          )}
        </form>

        {/* Filter & Table */}
        <div className="mt-6 space-y-3">
          {data && data.allowlistCount > 5 ? (
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <Input
                type="text"
                placeholder="Filter allowlisted emails…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
          ) : null}

          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--card-border)' }}
          >
            {data && data.allowlist.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No users are currently allowlisted. Add an email above to grant tester access.
              </div>
            ) : filteredAllowlist.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No allowlisted emails match &ldquo;{searchFilter}&rdquo;.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead
                  className="border-b text-xs font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tester Email</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {filteredAllowlist.map((email) => (
                    <tr
                      key={email}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {email}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmailToRemove(email)}
                          disabled={loading || removeSubmitting}
                          className="h-7 px-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog: Confirm Mode Change ── */}
      <Dialog
        open={Boolean(pendingMode)}
        onOpenChange={(open) => {
          if (!open && !modeSubmitting) setPendingMode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You are changing AI Interview Coach access.</DialogTitle>
            <DialogDescription>
              This change takes effect immediately across all client sessions and server routes.
            </DialogDescription>
          </DialogHeader>

          {pendingMode && data ? (
            <div className="space-y-4 py-2 text-xs">
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)',
                }}
              >
                <div className="flex items-center justify-between py-1">
                  <span style={{ color: 'var(--text-muted)' }}>Current Mode:</span>
                  <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {MODE_CONFIG[data.mode].title}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--card-border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>New Mode:</span>
                  <span
                    className="font-bold capitalize"
                    style={{ color: MODE_CONFIG[pendingMode].color }}
                  >
                    {MODE_CONFIG[pendingMode].title}
                  </span>
                </div>
              </div>

              <div
                className="rounded-xl border p-3 text-xs leading-relaxed"
                style={{
                  borderColor: pendingMode === 'public' || pendingMode === 'disabled'
                    ? 'color-mix(in srgb, var(--accent-danger) 30%, transparent)'
                    : 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                <p className="font-semibold">Operational Consequence:</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {MODE_CONFIG[pendingMode].consequence}
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingMode(null)}
              disabled={modeSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={pendingMode === 'disabled' ? 'destructive' : 'default'}
              onClick={() => void handleConfirmModeChange()}
              disabled={modeSubmitting}
            >
              {modeSubmitting ? 'Updating Mode…' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Remove Email ── */}
      <Dialog
        open={Boolean(emailToRemove)}
        onOpenChange={(open) => {
          if (!open && !removeSubmitting) setEmailToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this user from the Coach allowlist?</DialogTitle>
            <DialogDescription>
              The user will immediately lose access to AI Interview Coach if Allowlist mode is currently active.
            </DialogDescription>
          </DialogHeader>

          {emailToRemove ? (
            <div
              className="rounded-xl border p-3 font-mono text-xs"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              {emailToRemove}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailToRemove(null)}
              disabled={removeSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmRemoveEmail()}
              disabled={removeSubmitting}
            >
              {removeSubmitting ? 'Removing…' : 'Remove User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Clear Allowlist ── */}
      <Dialog
        open={clearDialogOpen}
        onOpenChange={(open) => {
          if (!open && !clearSubmitting) setClearDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all allowlisted users?</DialogTitle>
            <DialogDescription>
              This will remove all allowlisted users. Users who are not platform administrators will lose Coach access while Allowlist mode is active.
            </DialogDescription>
          </DialogHeader>

          <div
            className="rounded-xl border p-3 text-xs leading-relaxed"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
              background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <p className="font-semibold text-red-500">Warning: High-Impact Action</p>
            <p className="mt-1">
              Currently {data?.allowlistCount ?? 0} user(s) are registered. This action deletes all addresses from the allowlist immediately.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              disabled={clearSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmClearAllowlist()}
              disabled={clearSubmitting}
            >
              {clearSubmitting ? 'Clearing Allowlist…' : 'Clear Entire Allowlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
