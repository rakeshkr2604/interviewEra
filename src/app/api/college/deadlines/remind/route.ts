import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBaseUrl } from '@/lib/server/get-base-url';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, name')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { deadlineId, emails, deadlineDescription } = await request.json();

    if (!deadlineId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: deadline } = await serviceClient
      .from('college_deadlines')
      .select('due_date, target_value, deadline_type')
      .eq('id', deadlineId)
      .eq('college_id', org.id)
      .single();

    if (!deadline) {
      return NextResponse.json({ error: 'Deadline not found' }, { status: 404 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = getBaseUrl();
    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((email: string) =>
          resend.emails.send({
            from: 'InterviewEra <noreply@interviewera.com>',
            to: email,
            subject: `Reminder: ${deadlineDescription} due ${new Date(deadline.due_date).toLocaleDateString('en-IN')}`,
            html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      padding: 24px 0;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .header-title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .content {
      padding: 24px 0;
    }
    .content-text {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #374151;
      line-height: 1.7;
    }
    .alert {
      margin: 20px 0;
      padding: 16px;
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      color: #78350f;
      font-weight: 500;
    }
    .deadline-box {
      margin: 20px 0;
      padding: 16px;
      background-color: #f3f4f6;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .deadline-box-title {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .deadline-box-info {
      font-size: 14px;
      color: #374151;
      margin: 0;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 28px;
      background-color: #5b21b6;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .footer-text {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">⏰ Deadline Reminder</h1>
    </div>

    <div class="content">
      <p class="content-text">Hi there,</p>

      <p class="content-text">
        This is a friendly reminder that <strong>${org.name}</strong> has set a deadline for you to complete:
      </p>

      <div class="deadline-box">
        <p class="deadline-box-title">${deadlineDescription}</p>
        <p class="deadline-box-info">
          <strong>Due Date:</strong> ${new Date(deadline.due_date).toLocaleDateString('en-IN')}
        </p>
        <p class="deadline-box-info">
          <strong>Target:</strong> ${deadline.target_value}
        </p>
      </div>

      <div class="alert">
        ⏰ Make sure to complete this deadline by the due date to stay on track with your placement preparation!
      </div>

      <p class="content-text">
        Start working on this milestone today and track your progress on the platform.
      </p>

      <a href="${appUrl}/dashboard" class="cta-button">Continue Learning</a>

      <p class="content-text" style="font-size: 13px; color: #6b7280;">
        If you have any questions about this deadline, reach out to your T&P officer.
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © 2026 InterviewEra. Helping students ace their placements.
      </p>
    </div>
  </div>
</body>
</html>`,
          })
        )
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          console.error('[college/deadlines/remind] Email send failed:', result.reason);
        }
      });
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Reminders sent to ${sent} student${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`,
    });
  } catch (err) {
    console.error('[college/deadlines/remind] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
