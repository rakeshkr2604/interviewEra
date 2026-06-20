import type { InterviewWithReportsRow } from '@/app/(dashboard)/dashboard/dashboard-types';
import type { RetentionDashboardSnapshot } from '@/components/dashboard/RetentionProgressCard';

export function pickRecentInterviews(rows: InterviewWithReportsRow[], limit = 3) {
  const completed = rows.filter((row) => row.status === 'completed');
  const incomplete = rows.filter((row) => row.status !== 'completed');

  const picked: InterviewWithReportsRow[] = [];
  if (completed[0]) picked.push(completed[0]);
  for (const row of incomplete) {
    if (picked.length >= limit) break;
    picked.push(row);
  }
  for (const row of completed.slice(1)) {
    if (picked.length >= limit) break;
    picked.push(row);
  }

  return picked.slice(0, limit);
}

export function countHiddenInterviews(rows: InterviewWithReportsRow[], visible: InterviewWithReportsRow[]) {
  return Math.max(0, rows.length - visible.length);
}

export type { RetentionDashboardSnapshot };
