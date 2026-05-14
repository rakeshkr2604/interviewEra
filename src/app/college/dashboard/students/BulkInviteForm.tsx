'use client';

import { useState, useRef } from 'react';

interface InviteResult {
  invited: number;
  skipped: number;
  emailErrors: number;
  message: string;
  failedEmails?: string[];
}

function parseCSV(text: string): string[] {
  return text
    .split(/[\r\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@') && s.includes('.'));
}

interface BulkInviteFormProps {
  seatsAvailable: number;
}

export function BulkInviteForm({ seatsAvailable }: BulkInviteFormProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setEmails(parsed);
      setRawInput(parsed.join('\n'));
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setRawInput(text);
    setEmails(parseCSV(text));
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length === 0) return;

    if (emails.length > seatsAvailable) {
      setError(`Only ${seatsAvailable} seats available. You're trying to invite ${emails.length} students.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/college/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const data = (await res.json()) as InviteResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setResult(data);
        setEmails([]);
        setRawInput('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-premium-card space-y-5">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Invite Students</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload a CSV file or paste email addresses. Students will receive an invitation link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CSV upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Upload CSV or TXT
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium"
            style={{
              color: 'var(--text-secondary)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            One email per row, or comma-separated.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--card-border)' }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>or paste emails</span>
          </div>
        </div>

        {/* Manual paste */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Email addresses
          </label>
          <textarea
            rows={6}
            value={rawInput}
            onChange={handleTextChange}
            placeholder="student1@example.com&#10;student2@example.com"
            className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 resize-none"
            style={{
              border: '1.5px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Preview count */}
        {emails.length > 0 && (
          <div
            className="flex items-center justify-between rounded-xl border p-3"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
              <span className="font-semibold">{emails.length}</span> valid email
              {emails.length !== 1 ? 's' : ''} detected
            </p>
            {emails.length > seatsAvailable && (
              <p className="text-xs" style={{ color: 'var(--accent-danger)' }}>Exceeds available seats</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--accent-danger) 25%, transparent)',
              color: 'var(--accent-danger)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--accent-success) 25%, transparent)',
              color: 'var(--accent-success)',
            }}
          >
            <p className="font-medium">{result.message}</p>
            {result.skipped > 0 && (
              <p className="mt-1 opacity-80">
                {result.skipped} email{result.skipped !== 1 ? 's' : ''} skipped (already invited or enrolled).
              </p>
            )}
            {result.emailErrors > 0 && (
              <p className="mt-1 opacity-80">
                {result.emailErrors} email{result.emailErrors !== 1 ? 's' : ''} failed to send. Check your email configuration.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || emails.length === 0 || emails.length > seatsAvailable}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          style={{ background: 'var(--accent-primary)' }}
        >
          {loading ? 'Sending invitations…' : `Send ${emails.length || ''} Invitation${emails.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}
