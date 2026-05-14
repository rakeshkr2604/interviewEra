'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CreateDeadlineModalProps {
  orgId: string;
  orgName: string;
}

type DeadlineType = 'sessions' | 'tier' | 'score';

export function CreateDeadlineModal({ orgId }: CreateDeadlineModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    type: 'sessions' as DeadlineType,
    targetValue: '',
    dueDate: '',
    mandatory: true,
  });

  const targetLabels: Record<DeadlineType, string> = {
    sessions: 'Number of Sessions',
    tier: 'Tier Level (1-4)',
    score: 'Average Score (0-10)',
  };

  const placeholders: Record<DeadlineType, string> = {
    sessions: 'e.g., 5',
    tier: 'e.g., 2',
    score: 'e.g., 7.5',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.description.trim()) {
        setError('Please enter a title/description');
        return;
      }
      if (!formData.targetValue) {
        setError('Please enter a target value');
        return;
      }
      if (!formData.dueDate) {
        setError('Please select a due date');
        return;
      }

      const targetValue = parseFloat(formData.targetValue);
      if (isNaN(targetValue)) {
        setError('Target value must be a valid number');
        return;
      }

      const response = await fetch('/api/college/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          type: formData.type,
          targetValue,
          dueDate: formData.dueDate,
          mandatory: formData.mandatory,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create deadline');
        return;
      }

      setSuccess(true);
      setFormData({
        description: '',
        type: 'sessions',
        targetValue: '',
        dueDate: '',
        mandatory: true,
      });

      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        + Create Deadline
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Deadline</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Complete baseline assessment"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {(['sessions', 'tier', 'score'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={formData.type === type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as DeadlineType })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {type === 'sessions' ? '📝 Complete Sessions' : type === 'tier' ? '⬆️ Unlock Tier' : '⭐ Achieve Score'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {targetLabels[formData.type]} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step={formData.type === 'score' ? '0.1' : '1'}
                  min={formData.type === 'tier' ? '1' : '0'}
                  max={formData.type === 'tier' ? '4' : formData.type === 'score' ? '10' : undefined}
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder={placeholders[formData.type]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mandatory}
                  onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Mandatory deadline</span>
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  Deadline created successfully!
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Create Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Dialog>
  );
}
