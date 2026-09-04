import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

let db: FakeDb;
let isAdmin = true;

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => {
    if (!isAdmin) {
      return {
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        user: null,
      };
    }
    return { error: null, user: { id: 'admin-1', email: 'admin@interviewera.com' } };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeFakeServiceClient(db),
}));

import { GET } from '@/app/api/admin/feedback/route';
import { PATCH, DELETE } from '@/app/api/admin/feedback/[id]/route';

const IV_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const PF_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const IF_ID = 'cccccccc-3333-4333-8333-333333333333';

function getReq(params: string = ''): Request {
  return new Request(`http://localhost/api/admin/feedback?${params}`, {
    method: 'GET',
  });
}

function patchReq(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteReq(id: string): Request {
  return new Request(`http://localhost/api/admin/feedback/${id}`, {
    method: 'DELETE',
  });
}

describe('Admin Feedback API with Interview Feedback support', () => {
  beforeEach(() => {
    isAdmin = true;
    db = {
      users: [
        { id: 'u-1', name: 'Rohan Sharma', email: 'rohan@example.com' },
      ],
      interviews: [
        {
          id: IV_ID,
          user_id: 'u-1',
          role: 'Full Stack Developer',
          difficulty: 'medium',
          engine: 'v2.1',
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      ],
      reports: [
        { id: 'rep-1', interview_id: IV_ID },
      ],
      feedbacks: [
        {
          id: PF_ID,
          user_id: 'u-1',
          name: 'Rohan Sharma',
          email: 'rohan@example.com',
          rating: 4,
          liked_text: 'Great platform experience',
          confusion_text: '',
          bugs_text: '',
          page_url: '/dashboard',
          browser_info: 'Chrome',
          severity: 'low',
          is_read: false,
          is_resolved: false,
          is_archived: false,
          is_pinned: false,
          notes: null,
          created_at: new Date(Date.now() - 10000).toISOString(),
        },
      ],
      interview_feedbacks: [
        {
          id: IF_ID,
          user_id: 'u-1',
          interview_id: IV_ID,
          rating: 5,
          liked_aspect: 'Questions matched my resume/experience',
          issue_type: 'No issues',
          comment: 'The voice interviewer felt very natural.',
          is_read: false,
          is_resolved: false,
          is_archived: false,
          is_pinned: false,
          notes: null,
          created_at: new Date().toISOString(),
        },
      ],
      technical_failure_cases: [],
      credit_transactions: [],
    };
  });

  it('returns both platform and interview feedback when source=all', async () => {
    const res = await GET(getReq('source=all'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBe(2);

    const interviewItem = data.items.find((i: { id: string }) => i.id === IF_ID);
    expect(interviewItem).toBeDefined();
    expect(interviewItem.feedback_source).toBe('interview');
    expect(interviewItem.interview_context).toBeDefined();
    expect(interviewItem.interview_context.role).toBe('Full Stack Developer');
    expect(interviewItem.interview_context.report_id).toBe('rep-1');
  });

  it('filters strictly by source=interview', async () => {
    const res = await GET(getReq('source=interview'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].id).toBe(IF_ID);
    expect(data.items[0].feedback_source).toBe('interview');
  });

  it('supports PATCH triage mutations on interview feedback', async () => {
    const res = await PATCH(
      patchReq(IF_ID, { is_resolved: true, notes: 'Followed up with candidate' }),
      { params: Promise.resolve({ id: IF_ID }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.row.is_resolved).toBe(true);
    expect(data.row.notes).toBe('Followed up with candidate');

    // DB state updated
    expect(db.interview_feedbacks[0].is_resolved).toBe(true);
    expect(db.interview_feedbacks[0].notes).toBe('Followed up with candidate');
  });

  it('supports DELETE on interview feedback', async () => {
    const res = await DELETE(deleteReq(IF_ID), {
      params: Promise.resolve({ id: IF_ID }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(db.interview_feedbacks).toHaveLength(0);
  });
});
