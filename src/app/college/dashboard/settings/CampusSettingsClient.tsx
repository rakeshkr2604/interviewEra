'use client';

import { useState, useTransition } from 'react';
import {
  Building2,
  Palette,
  Bell,
  CreditCard,
  Shield,
  Check,
  Loader2,
} from 'lucide-react';
import { ThemeAppearanceControl } from '@/components/settings/ThemeAppearanceControl';
import { SettingsSwitch } from '@/components/settings/SettingsSwitch';
import { updateOrgProfile } from './actions';

interface OrgData {
  id: string;
  name: string;
  seatCount: number;
  seatsUsed: number;
  pendingInvites: number;
  planStart: string | null;
  contactEmail: string | null;
  coordinatorName: string | null;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' }}
      >
        <Icon className="size-5" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingsCard({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className="dashboard-premium-card p-6"
    >
      {children}
    </section>
  );
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="sm:max-w-xs">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="sm:flex-1 sm:max-w-sm">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px my-5" style={{ background: 'var(--card-border)' }} />;
}

function TextInput({
  name,
  defaultValue,
  placeholder,
  type = 'text',
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      name={name}
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
      style={{
        border: '1.5px solid var(--card-border)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}
    />
  );
}

function NotificationRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <FieldRow label={label} description={description}>
      <div className="flex items-center justify-end sm:justify-start">
        <SettingsSwitch checked={checked} onCheckedChange={setChecked} />
      </div>
    </FieldRow>
  );
}

export function CampusSettingsClient({ org }: { org: OrgData }) {
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      setSaveState('idle');
      const result = await updateOrgProfile(data);
      if (result.error) {
        setSaveState('error');
        setErrorMsg(result.error);
      } else {
        setSaveState('success');
        setTimeout(() => setSaveState('idle'), 2500);
      }
    });
  }

  const seatsRemaining = org.seatCount - org.seatsUsed;
  const seatPct = org.seatCount > 0 ? Math.round((org.seatsUsed / org.seatCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* ── Organization Profile ─────────────────────────── */}
      <SettingsCard id="profile">
        <SectionHeader
          icon={Building2}
          title="Organization Profile"
          description="Basic information about your institution shown to students."
        />

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <FieldRow
            label="Organization Name"
            description="Your college or institution's official name."
          >
            <TextInput
              name="name"
              defaultValue={org.name}
              placeholder="e.g., RKY University"
            />
          </FieldRow>

          {org.coordinatorName !== undefined && (
            <>
              <Divider />
              <FieldRow
                label="Placement Coordinator"
                description="Name of the T&P officer shown in student communications."
              >
                <TextInput
                  name="coordinator_name"
                  defaultValue={org.coordinatorName}
                  placeholder="e.g., Dr. Anil Sharma"
                />
              </FieldRow>
            </>
          )}

          {org.contactEmail !== undefined && (
            <>
              <Divider />
              <FieldRow
                label="Contact Email"
                description="Email address for student queries and platform notifications."
              >
                <TextInput
                  name="contact_email"
                  type="email"
                  defaultValue={org.contactEmail}
                  placeholder="placements@university.edu"
                />
              </FieldRow>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            {saveState === 'error' && (
              <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>
                {errorMsg}
              </p>
            )}
            {saveState === 'success' && (
              <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--accent-success)' }}>
                <Check className="size-4" />
                Saved successfully
              </p>
            )}
            {saveState === 'idle' && <span />}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
              style={{ background: 'var(--accent-primary)' }}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </SettingsCard>

      {/* ── Plan & Seats ─────────────────────────────────── */}
      <SettingsCard id="billing">
        <SectionHeader
          icon={CreditCard}
          title="Plan &amp; Seats"
          description="Your current subscription and seat utilization."
        />

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Seats', value: org.seatCount, color: 'var(--text-primary)' },
              { label: 'Enrolled', value: org.seatsUsed - org.pendingInvites, color: 'var(--accent-success)' },
              { label: 'Pending Invites', value: org.pendingInvites, color: 'var(--accent-warning)' },
              { label: 'Available', value: seatsRemaining, color: seatsRemaining < 10 ? 'var(--accent-warning)' : 'var(--accent-primary)' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {s.label}
                </p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Seat bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Seat usage</span>
              <span>{seatPct}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--card-border)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${seatPct}%`,
                  background: seatPct > 85 ? 'var(--accent-warning)' : 'var(--accent-primary)',
                }}
              />
            </div>
          </div>

          <Divider />

          <FieldRow
            label="Active Plan"
            description="Your current campus license."
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                Campus Plan
              </span>
              {org.planStart && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Active since {new Date(org.planStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </FieldRow>

          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
              background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            To increase your seat count or upgrade your plan, contact{' '}
            <a
              href="mailto:enterprise@interviewera.in"
              className="font-medium underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              enterprise@interviewera.in
            </a>
          </div>
        </div>
      </SettingsCard>

      {/* ── Appearance ───────────────────────────────────── */}
      <SettingsCard id="appearance">
        <SectionHeader
          icon={Palette}
          title="Appearance"
          description="Choose how the campus dashboard looks. Stored in this browser."
        />
        <div className="max-w-sm">
          <ThemeAppearanceControl />
        </div>
      </SettingsCard>

      {/* ── Notifications ────────────────────────────────── */}
      <SettingsCard id="notifications">
        <SectionHeader
          icon={Bell}
          title="Notifications"
          description="Control which alerts you receive by email."
        />

        <div className="space-y-5">
          <NotificationRow
            label="New student enrolled"
            description="Email when a student accepts their invite and joins the platform."
            defaultChecked={true}
          />
          <Divider />
          <NotificationRow
            label="Deadline approaching"
            description="Reminder 48 hours before a deadline is due."
            defaultChecked={true}
          />
          <Divider />
          <NotificationRow
            label="Student inactivity alert"
            description="Alert when a student hasn't completed an interview in 7 days."
            defaultChecked={false}
          />
          <Divider />
          <NotificationRow
            label="Weekly cohort digest"
            description="Summary of cohort activity, scores, and placement readiness every Monday."
            defaultChecked={true}
          />

          <div
            className="mt-2 rounded-xl border px-4 py-3 text-xs"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
            }}
          >
            Email notification preferences are saved per-browser. Full webhook and email configuration is coming in a future update.
          </div>
        </div>
      </SettingsCard>

      {/* ── Security ─────────────────────────────────────── */}
      <SettingsCard id="security">
        <SectionHeader
          icon={Shield}
          title="Security"
          description="Access controls and audit information."
        />

        <div className="space-y-5">
          <FieldRow
            label="Admin Account"
            description="The Supabase Auth account with campus_admin access."
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Managed via Supabase Auth
            </p>
          </FieldRow>

          <Divider />

          <FieldRow
            label="Role"
            description="Your current platform role."
          >
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)',
                color: 'var(--accent-warning)',
              }}
            >
              campus_admin
            </span>
          </FieldRow>

          <Divider />

          <div
            className="rounded-xl border px-4 py-3 text-xs"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
            }}
          >
            Audit logs, session management, and multi-admin support are planned for a future release. Contact support for urgent security concerns.
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
