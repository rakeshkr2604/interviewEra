import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
}

export async function GET(): Promise<NextResponse> {
  try {
    // ── Auth + campus_admin gate ───────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    if (profile?.plan_tier !== 'campus_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Fetch org ──────────────────────────────────────────────────────────────
    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, name')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Campus organization not found' }, { status: 404 });
    }

    // ── Fetch students ─────────────────────────────────────────────────────────
    const { data: students } = await serviceClient
      .from('users')
      .select('id, email, name, created_at')
      .eq('campus_org_id', org.id);

    if (!students || students.length === 0) {
      const csv = buildCSV([
        ['Name', 'Email', 'Interviews Completed', 'Avg Score', 'Last Interview', 'Joined On'],
      ]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${org.name.replace(/\s+/g, '_')}_students.csv"`,
        },
      });
    }

    const studentIds = students.map((s) => s.id);

    // ── Fetch completed interviews ─────────────────────────────────────────────
    const { data: interviews } = await serviceClient
      .from('interviews')
      .select('id, user_id, completed_at, status')
      .in('user_id', studentIds)
      .eq('status', 'completed');

    const completedIds = (interviews ?? []).map((i) => i.id);

    // ── Fetch reports ──────────────────────────────────────────────────────────
    const { data: reports } =
      completedIds.length > 0
        ? await serviceClient
            .from('reports')
            .select('interview_id, overall_score')
            .in('interview_id', completedIds)
        : { data: [] };

    const scoreByInterview = new Map<string, number>(
      (reports ?? []).map((r) => [r.interview_id, r.overall_score])
    );

    // ── Build CSV rows ─────────────────────────────────────────────────────────
    const header = [
      'Name',
      'Email',
      'Interviews Completed',
      'Avg Score (out of 10)',
      'Last Interview Date',
      'Joined On',
    ];

    const dataRows = students.map((s) => {
      const myInterviews = (interviews ?? []).filter((i) => i.user_id === s.id);
      const myScores = myInterviews
        .map((i) => scoreByInterview.get(i.id))
        .filter((v): v is number => v !== undefined);

      const avgScore =
        myScores.length > 0
          ? (myScores.reduce((a, b) => a + b, 0) / myScores.length).toFixed(1)
          : null;

      const lastAt = myInterviews
        .map((i) => i.completed_at)
        .filter(Boolean)
        .sort()
        .at(-1);

      return [
        s.name ?? '',
        s.email,
        String(myInterviews.length),
        avgScore ?? '',
        lastAt ? new Date(lastAt).toLocaleDateString('en-IN') : '',
        new Date(s.created_at).toLocaleDateString('en-IN'),
      ];
    });

    const csv = buildCSV([header, ...dataRows]);
    const filename = `${org.name.replace(/[^a-z0-9_\- ]/gi, '').replace(/\s+/g, '_')}_students_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[export-csv] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
