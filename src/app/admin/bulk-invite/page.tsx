'use client';

import { useState, useRef } from 'react';

interface InviteResult {
  invited: number;
  skipped: number;
  emailErrors: number;
  message: string;
}

function parseCSV(text: string): string[] {
  return text
    .split(/[\r\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@') && s.includes('.'));
}

export default function BulkInvitePage() {
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

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/bulk-invite', {
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Invite Students</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file or paste email addresses below. Students will receive an invitation
          email with a unique link to join your campus plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-white p-6">
        {/* CSV upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Upload CSV
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            One email per row, or comma-separated. First row may be a header — it will be
            ignored if it does not contain @.
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Preview count */}
        {emails.length > 0 && (
          <p className="text-sm text-gray-600">
            <span className="font-medium text-blue-700">{emails.length}</span> valid email
            {emails.length !== 1 ? 's' : ''} detected
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">{result.message}</p>
            {result.skipped > 0 && (
              <p className="mt-1 text-green-700">
                {result.skipped} email{result.skipped !== 1 ? 's' : ''} skipped (already invited or
                enrolled).
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || emails.length === 0}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending invitations…' : `Send ${emails.length || ''} Invitation${emails.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
}
