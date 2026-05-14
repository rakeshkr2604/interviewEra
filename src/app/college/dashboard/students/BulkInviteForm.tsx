'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  orgId: string;
  orgName: string;
  seatsAvailable: number;
}

export function BulkInviteForm({ orgId, seatsAvailable }: BulkInviteFormProps) {
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
    <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Invite Students</h3>
        <p className="mt-1 text-sm text-gray-600">
          Upload a CSV file or paste email addresses. Students will receive an invitation link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CSV upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Upload CSV or TXT
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            One email per row, or comma-separated.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">or paste emails</span>
          </div>
        </div>

        {/* Manual paste */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email addresses
          </label>
          <textarea
            rows={6}
            value={rawInput}
            onChange={handleTextChange}
            placeholder="student1@example.com&#10;student2@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Preview count */}
        {emails.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold text-blue-700">{emails.length}</span> valid email
              {emails.length !== 1 ? 's' : ''} detected
            </p>
            {emails.length > seatsAvailable && (
              <p className="text-xs text-red-700">Exceeds available seats</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">{result.message}</p>
            {result.skipped > 0 && (
              <p className="mt-1 text-green-700">
                {result.skipped} email{result.skipped !== 1 ? 's' : ''} skipped (already invited or enrolled).
              </p>
            )}
            {result.emailErrors > 0 && (
              <p className="mt-1 text-green-700">
                {result.emailErrors} email{result.emailErrors !== 1 ? 's' : ''} failed to send. Check your email configuration.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || emails.length === 0 || emails.length > seatsAvailable}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? 'Sending invitations…' : `Send ${emails.length || ''} Invitation${emails.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}
