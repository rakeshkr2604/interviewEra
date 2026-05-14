'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface SendReminderButtonProps {
  deadlineId: string;
  incompleteStuents: string[];
  deadlineDescription: string;
}

export function SendReminderButton({
  deadlineId,
  incompleteStuents,
  deadlineDescription,
}: SendReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSendReminder() {
    if (incompleteStuents.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/college/deadlines/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadlineId,
          emails: incompleteStuents,
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
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-60"
      >
        <Mail className="h-4 w-4" />
        {loading ? 'Sending...' : `Send Reminder (${incompleteStuents.length})`}
      </button>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 max-w-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 max-w-sm">
          Reminders sent to {incompleteStuents.length} student{incompleteStuents.length !== 1 ? 's' : ''}!
        </div>
      )}
    </>
  );
}
