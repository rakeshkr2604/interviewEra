'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CandidateProfileFields } from '@/lib/candidate/types';

const EXPERIENCE_OPTIONS: { value: CandidateProfileFields['experienceLevel']; label: string }[] = [
  { value: 'fresher', label: 'Fresher (0 yrs)' },
  { value: 'junior', label: 'Junior (1–2 yrs)' },
  { value: 'mid', label: 'Mid (3–5 yrs)' },
  { value: 'senior', label: 'Senior (6+ yrs)' },
];

export function CandidateProfilePanel({ initial }: { initial: CandidateProfileFields }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/account/candidate-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setStatus({ tone: 'err', message: data?.error ?? 'Could not save profile.' });
        return;
      }
      setStatus({ tone: 'ok', message: 'Profile saved.' });
      window.setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ tone: 'err', message: 'Network error. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preferred-role">Preferred role</Label>
          <Input
            id="preferred-role"
            value={draft.preferredRole}
            onChange={(e) => setDraft((d) => ({ ...d, preferredRole: e.target.value }))}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="graduation-year">Graduation year</Label>
          <Input
            id="graduation-year"
            type="number"
            inputMode="numeric"
            min={1990}
            max={new Date().getFullYear() + 6}
            value={draft.graduationYear ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({
                ...d,
                graduationYear: raw ? Number.parseInt(raw, 10) : null,
              }));
            }}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="college-name">College</Label>
          <Input
            id="college-name"
            value={draft.collegeName}
            onChange={(e) => setDraft((d) => ({ ...d, collegeName: e.target.value }))}
            maxLength={200}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="experience-level">Experience level</Label>
          <select
            id="experience-level"
            className="w-full rounded-2xl border-2 px-4 py-2.5 text-sm"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
            value={draft.experienceLevel}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                experienceLevel: e.target.value as CandidateProfileFields['experienceLevel'],
              }))
            }
          >
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status ? (
        <p
          className="text-sm"
          role="status"
          style={{ color: status.tone === 'ok' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}
        >
          {status.message}
        </p>
      ) : null}

      <Button type="button" onClick={() => void save()} disabled={saving} className="min-h-11">
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
    </div>
  );
}
