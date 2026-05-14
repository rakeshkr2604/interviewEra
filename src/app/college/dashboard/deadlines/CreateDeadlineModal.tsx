'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';

interface CreateDeadlineModalProps {
  orgName: string;
}

type DeadlineType = 'sessions' | 'tier' | 'score';

export function CreateDeadlineModal({}: CreateDeadlineModalProps) {
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

  const inputStyle = {
    border: '1.5px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
        style={{ background: 'var(--accent-primary)' }}
      >
        + Create Deadline
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-[22px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Create Deadline</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Title / Description <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Complete baseline assessment"
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Type <span style={{ color: 'var(--accent-danger)' }}>*</span>
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
                        className="w-4 h-4"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {type === 'sessions' ? '📝 Complete Sessions' : type === 'tier' ? '⬆️ Unlock Tier' : '⭐ Achieve Score'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {targetLabels[formData.type]} <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  step={formData.type === 'score' ? '0.1' : '1'}
                  min={formData.type === 'tier' ? '1' : '0'}
                  max={formData.type === 'tier' ? '4' : formData.type === 'score' ? '10' : undefined}
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder={placeholders[formData.type]}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Due Date <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={inputStyle}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mandatory}
                  onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mandatory deadline</span>
              </label>

              {error && (
                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
                    color: 'var(--accent-danger)',
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="rounded-xl border p-3 text-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)',
                    color: 'var(--accent-success)',
                  }}
                >
                  Deadline created successfully!
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
                  style={{ background: 'var(--accent-primary)' }}
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
