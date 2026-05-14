'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';

interface StudentWithProgress {
  id: string;
  name: string | null;
  email: string;
  branch: string | null;
  roll_number: string | null;
  enrollment_status: string;
  enrolled_at: string;
  total_sessions: number;
  avg_score: number | null;
  current_tier: number;
}

type SortField = 'name' | 'sessions' | 'score' | 'tier';

interface StudentListTableProps {
  students: StudentWithProgress[];
}

export function StudentListTable({ students }: StudentListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDesc, setSortDesc] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (
        (s.name?.toLowerCase() ?? '').includes(term) ||
        s.email.toLowerCase().includes(term) ||
        (s.roll_number?.toLowerCase() ?? '').includes(term)
      );
    });
  }, [students, searchTerm]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortField) {
        case 'name':
          aVal = a.name?.toLowerCase() ?? '';
          bVal = b.name?.toLowerCase() ?? '';
          break;
        case 'sessions':
          aVal = a.total_sessions;
          bVal = b.total_sessions;
          break;
        case 'score':
          aVal = a.avg_score ?? 0;
          bVal = b.avg_score ?? 0;
          break;
        case 'tier':
          aVal = a.current_tier;
          bVal = b.current_tier;
          break;
      }

      if (aVal < bVal) return sortDesc ? 1 : -1;
      if (aVal > bVal) return sortDesc ? -1 : 1;
      return 0;
    });
    return copy;
  }, [filtered, sortField, sortDesc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  const TierBadge = ({ tier }: { tier: number }) => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-purple-100 text-purple-800',
      4: 'bg-amber-100 text-amber-800',
    };
    const labels: Record<number, string> = {
      1: 'Tier 1',
      2: 'Tier 2',
      3: 'Tier 3',
      4: 'Tier 4',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tier as keyof typeof colors] || colors[1]}`}>
        {labels[tier] || 'Tier 1'}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      dropped: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
    >
      {label}
      {sortField === field && (
        <ArrowUpDown className={`h-3 w-3 ${sortDesc ? 'rotate-180' : ''}`} />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="border-b px-5 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left font-medium">
                <SortButton field="name" label="Name / Email" />
              </th>
              <th className="px-5 py-3 text-left font-medium">Branch / Roll</th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="sessions" label="Sessions" />
              </th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="score" label="Avg Score" />
              </th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="tier" label="Tier" />
              </th>
              <th className="px-5 py-3 text-center font-medium">Status</th>
              <th className="px-5 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{student.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  <p>{student.branch ?? '—'}</p>
                  <p className="text-xs text-gray-500">{student.roll_number ?? '—'}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="font-semibold text-gray-900">{student.total_sessions}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  {student.avg_score !== null ? (
                    <p className="font-semibold text-gray-900">
                      {(student.avg_score as number).toFixed(1)}/10
                    </p>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <TierBadge tier={student.current_tier} />
                </td>
                <td className="px-5 py-4 text-center">
                  <StatusBadge status={student.enrollment_status} />
                </td>
                <td className="px-5 py-4 text-center">
                  <Link
                    href={`/college/dashboard/students/${student.id}`}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Details
                  </Link>
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
      <div className="border-t px-5 py-3 text-xs text-gray-500">
        Showing {sorted.length} of {students.length} student{students.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
