'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StudentWithProgress } from '@/lib/college/types';

type SortField = 'name' | 'sessions' | 'score' | 'tier';

interface StudentListTableProps {
  students: StudentWithProgress[];
}

const PAGE_SIZE = 20;

const tierStyles: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'color-mix(in srgb, var(--text-muted) 12%, transparent)', color: 'var(--text-secondary)', label: 'Tier 1' },
  2: { bg: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)', label: 'Tier 2' },
  3: { bg: 'color-mix(in srgb, #a855f7 14%, transparent)', color: '#a855f7', label: 'Tier 3' },
  4: { bg: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)', color: 'var(--accent-warning)', label: 'Tier 4' },
};

function TierBadge({ tier }: { tier: number }) {
  const s = tierStyles[tier] ?? tierStyles[1];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

const statusStyles: Record<string, { bg: string; color: string }> = {
  active: { bg: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' },
  completed: { bg: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' },
  dropped: { bg: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)', color: 'var(--accent-danger)' },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] ?? statusStyles.active;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SortButton({
  field,
  label,
  sortField,
  sortDesc,
  toggleSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDesc: boolean;
  toggleSort: (field: SortField) => void;
}) {
  return (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      {label}
      {sortField === field && (
        <ArrowUpDown className={`h-3 w-3 ${sortDesc ? 'rotate-180' : ''}`} />
      )}
    </button>
  );
}

export function StudentListTable({ students }: StudentListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(0);

  const branches = useMemo(() => {
    const set = new Set(students.map((s) => s.branch).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (s.name?.toLowerCase() ?? '').includes(term) ||
        s.email.toLowerCase().includes(term) ||
        (s.roll_number?.toLowerCase() ?? '').includes(term);
      const matchesBranch = branchFilter === 'all' || s.branch === branchFilter;
      const matchesStatus = statusFilter === 'all' || s.enrollment_status === statusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [students, searchTerm, branchFilter, statusFilter]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  return (
    <div className="space-y-0">
      <div className="border-b px-5 py-4 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or roll number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none"
              style={{
                border: '1.5px solid var(--card-border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <a
            href="/api/college/students/export"
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-xl px-3 py-1.5 text-sm"
            style={{
              border: '1.5px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All branches</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-xl px-3 py-1.5 text-sm"
            style={{
              border: '1.5px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="text-xs uppercase tracking-wide"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          >
            <tr>
              <th className="px-5 py-3 text-left font-medium">
                <SortButton field="name" label="Name / Email" sortField={sortField} sortDesc={sortDesc} toggleSort={toggleSort} />
              </th>
              <th className="px-5 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>
                Branch / Roll
              </th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="sessions" label="Sessions" sortField={sortField} sortDesc={sortDesc} toggleSort={toggleSort} />
              </th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="score" label="Avg Score" sortField={sortField} sortDesc={sortDesc} toggleSort={toggleSort} />
              </th>
              <th className="px-5 py-3 text-center font-medium">
                <SortButton field="tier" label="Tier" sortField={sortField} sortDesc={sortDesc} toggleSort={toggleSort} />
              </th>
              <th className="px-5 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                Resume
              </th>
              <th className="px-5 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                Status
              </th>
              <th className="px-5 py-3 text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((student) => (
              <tr
                key={student.id}
                className="border-t transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <td className="px-5 py-4">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {student.name ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {student.email}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p>{student.branch ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {student.roll_number ?? '—'}
                  </p>
                </td>
                <td className="px-5 py-4 text-center">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {student.total_sessions}
                  </p>
                </td>
                <td className="px-5 py-4 text-center">
                  {student.avg_score !== null ? (
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {student.avg_score.toFixed(1)}/10
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>—</p>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <TierBadge tier={student.current_tier} />
                </td>
                <td className="px-5 py-4 text-center text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                  {student.resume_status?.replace(/_/g, ' ') ?? '—'}
                </td>
                <td className="px-5 py-4 text-center">
                  <StatusBadge status={student.enrollment_status} />
                </td>
                <td className="px-5 py-4 text-center">
                  <Link
                    href={`/college/dashboard/students/${student.id}`}
                    className="inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No students found matching your filters
        </div>
      )}

      <div
        className="border-t px-5 py-3 flex items-center justify-between text-xs"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        <span>
          Showing {paginated.length} of {sorted.length} student{sorted.length !== 1 ? 's' : ''}
          {sorted.length !== students.length && ` (filtered from ${students.length})`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center rounded-lg border px-2 py-1 disabled:opacity-40"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center rounded-lg border px-2 py-1 disabled:opacity-40"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
