'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

interface Student {
  userId: string;
  name: string | null;
  email: string;
  currentValue: number | null;
  status: 'completed' | 'in_progress' | 'not_started';
}

type SortField = 'name' | 'status' | 'value';

interface StudentDeadlineListProps {
  students: Student[];
  deadlineType: 'sessions' | 'tier' | 'score';
  targetValue: number;
}

const statusLabels = {
  completed: '✅ Completed',
  in_progress: '🔄 In Progress',
  not_started: '❌ Not Started',
};

const statusCSSVars: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' },
  in_progress: { bg: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' },
  not_started: { bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)', color: 'var(--text-muted)' },
};

const typeLabels: Record<string, string> = {
  sessions: 'Sessions',
  tier: 'Tier',
  score: 'Score',
};

export function StudentDeadlineList({ students, deadlineType, targetValue }: StudentDeadlineListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDesc, setSortDesc] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (s.name?.toLowerCase() ?? '').includes(term) || s.email.toLowerCase().includes(term);
    });
  }, [students, searchTerm]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name?.toLowerCase() ?? '';
          bVal = b.name?.toLowerCase() ?? '';
          break;
        case 'status':
          const statusOrder = { completed: 0, in_progress: 1, not_started: 2 };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'value':
          aVal = a.currentValue ?? -1;
          bVal = b.currentValue ?? -1;
          break;
      }

      if (aVal < bVal) return sortDesc ? 1 : -1;
      if (aVal > bVal) return sortDesc ? -1 : 1;
      return 0;
    });
    return copy;
  }, [filtered, sortField, sortDesc]);

  return (
    <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
      {/* Search */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--card-border)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              border: '1.5px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide border-b" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
            <tr>
              <th className="px-6 py-3 text-left font-medium">
                <button
                  onClick={() => {
                    if (sortField === 'name') setSortDesc(!sortDesc);
                    else { setSortField('name'); setSortDesc(false); }
                  }}
                  aria-label={`Sort by name${sortField === 'name' ? (sortDesc ? ', currently descending' : ', currently ascending') : ''}`}
                  className="transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Name / Email {sortField === 'name' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-6 py-3 text-center font-medium">
                <button
                  onClick={() => {
                    if (sortField === 'value') setSortDesc(!sortDesc);
                    else { setSortField('value'); setSortDesc(false); }
                  }}
                  aria-label={`Sort by ${typeLabels[deadlineType]}${sortField === 'value' ? (sortDesc ? ', currently descending' : ', currently ascending') : ''}`}
                  className="transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {typeLabels[deadlineType]} {sortField === 'value' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-6 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Target</th>
              <th className="px-6 py-3 text-center font-medium">
                <button
                  onClick={() => {
                    if (sortField === 'status') setSortDesc(!sortDesc);
                    else { setSortField('status'); setSortDesc(false); }
                  }}
                  aria-label={`Sort by status${sortField === 'status' ? (sortDesc ? ', currently descending' : ', currently ascending') : ''}`}
                  className="transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Status {sortField === 'status' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((student) => (
              <tr
                key={student.userId}
                className="border-t transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <td className="px-6 py-4">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{student.name ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{student.email}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  {student.currentValue !== null ? (
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {student.currentValue}
                      {deadlineType === 'score' && '.0'}
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>—</p>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{targetValue}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={statusCSSVars[student.status]}
                  >
                    {statusLabels[student.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No students found matching &ldquo;{searchTerm}&rdquo;
        </div>
      )}

      {/* Result count */}
      <div className="border-t px-6 py-3 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
        Showing {sorted.length} of {students.length} student{students.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
