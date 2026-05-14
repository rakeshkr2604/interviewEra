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

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  not_started: 'bg-gray-100 text-gray-800',
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
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Search */}
      <div className="border-b px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium">
                <button
                  onClick={() => {
                    if (sortField === 'name') setSortDesc(!sortDesc);
                    else { setSortField('name'); setSortDesc(false); }
                  }}
                  className="hover:text-gray-700"
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
                  className="hover:text-gray-700"
                >
                  {typeLabels[deadlineType]} {sortField === 'value' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-6 py-3 text-center font-medium">Target</th>
              <th className="px-6 py-3 text-center font-medium">
                <button
                  onClick={() => {
                    if (sortField === 'status') setSortDesc(!sortDesc);
                    else { setSortField('status'); setSortDesc(false); }
                  }}
                  className="hover:text-gray-700"
                >
                  Status {sortField === 'status' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((student) => (
              <tr key={student.userId} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{student.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  {student.currentValue !== null ? (
                    <p className="font-semibold text-gray-900">
                      {student.currentValue}
                      {deadlineType === 'score' && '.0'}
                    </p>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="font-semibold text-gray-900">{targetValue}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[student.status]}`}>
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
        <div className="py-8 text-center text-sm text-gray-500">
          No students found matching "{searchTerm}"
        </div>
      )}

      {/* Result count */}
      <div className="border-t px-6 py-3 text-xs text-gray-500">
        Showing {sorted.length} of {students.length} student{students.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
