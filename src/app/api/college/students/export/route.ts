import { NextResponse } from 'next/server';
import { requireCampusAuth, isAuthError } from '@/lib/college/api-auth';
import { fetchStudentsWithProgress } from '@/lib/college/students-query';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireCampusAuth('students:read');
  if (isAuthError(auth)) return auth;

  const students = await fetchStudentsWithProgress(auth.org.id);

  const headers = [
    'Name',
    'Email',
    'Branch',
    'Roll Number',
    'Year',
    'Status',
    'Sessions',
    'Avg Score',
    'Tier',
    'Placement Ready',
    'Resume Status',
    'Enrolled At',
  ];

  const rows = students.map((s) =>
    [
      s.name,
      s.email,
      s.branch,
      s.roll_number,
      s.year,
      s.enrollment_status,
      s.total_sessions,
      s.avg_score,
      s.current_tier,
      s.placement_ready ? 'Yes' : 'No',
      s.resume_status,
      s.enrolled_at,
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const filename = `students-${auth.org.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
