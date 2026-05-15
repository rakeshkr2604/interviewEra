'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface SendReminderButtonProps {
  deadlineId: string;
  incompleteStudents: string[];
  deadlineDescription: string;
}

export function SendReminderButton({
  deadlineId,
  incompleteStudents,
  deadlineDescription,
}: SendReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSendReminder() {
    if (incompleteStudents.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/college/deadlines/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadlineId,
          emails: incompleteStudents,
          deadlineDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to send reminders');
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleSendReminder}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
      >
        <Mail className="h-4 w-4" />
        {loading ? 'Sending...' : `Send Reminder (${incompleteStudents.length})`}
      </button>

      {error && (
        <div
          className="fixed bottom-4 right-4 rounded-xl border p-3 text-sm max-w-sm z-50"
          style={{
            background: 'color-mix(in srgb, var(--accent-danger) 8%, var(--card-bg))',
            borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
            color: 'var(--accent-danger)',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="fixed bottom-4 right-4 rounded-xl border p-3 text-sm max-w-sm z-50"
          style={{
            background: 'color-mix(in srgb, var(--accent-success) 8%, var(--card-bg))',
            borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)',
            color: 'var(--accent-success)',
          }}
        >
          Reminders sent to {incompleteStudents.length} student{incompleteStudents.length !== 1 ? 's' : ''}!
        </div>
      )}
    </>
  );
}
