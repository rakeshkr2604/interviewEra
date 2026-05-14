import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const bodySchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    if (profile?.plan_tier !== 'campus_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, name, seat_count')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Campus organization not found' }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = bodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { emails } = validation.data;

    const { count: currentStudents } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('campus_org_id', org.id);

    const { count: pendingInvites } = await serviceClient
      .from('campus_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'pending');

    const used = (currentStudents ?? 0) + (pendingInvites ?? 0);
    const available = org.seat_count - used;

    if (emails.length > available) {
      return NextResponse.json(
        {
          error: `Only ${available} seats remaining. You are trying to invite ${emails.length} students.`,
        },
        { status: 422 }
      );
    }

    const { data: existingInvites } = await serviceClient
      .from('campus_invites')
      .select('email')
      .eq('org_id', org.id);

    const { data: existingUsers } = await serviceClient
      .from('users')
      .select('email')
      .in('email', emails);

    const alreadyInvited = new Set([
      ...(existingInvites ?? []).map((i) => i.email.toLowerCase()),
      ...(existingUsers ?? []).map((u) => u.email.toLowerCase()),
    ]);

    const toInvite = emails.filter((e) => !alreadyInvited.has(e.toLowerCase()));
    const skipped = emails.length - toInvite.length;

    if (toInvite.length === 0) {
      return NextResponse.json({
        invited: 0,
        skipped,
        message: 'All emails already invited or enrolled.',
      });
    }

    const { data: insertedInvites, error: insertError } = await serviceClient
      .from('campus_invites')
      .insert(toInvite.map((email) => ({ org_id: org.id, email })))
      .select('email, token');

    if (insertError || !insertedInvites) {
      console.error('[college/bulk-invite] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invites' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://interviewera.com';
    let emailErrors = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < insertedInvites.length; i += BATCH_SIZE) {
      const batch = insertedInvites.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((invite) =>
          resend.emails.send({
            from: 'InterviewEra <noreply@interviewera.com>',
            to: invite.email,
            subject: `You're invited to join ${org.name} on InterviewEra`,
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
      padding: 32px 0;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .header-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #111827;
    }
    .header-subtitle {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #6b7280;
    }
    .content {
      padding: 32px 0;
    }
    .content-text {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #374151;
      line-height: 1.7;
    }
    .content-text strong {
      color: #111827;
      font-weight: 600;
    }
    .features {
      margin: 24px 0;
      padding: 20px;
      background-color: #f3f4f6;
      border-radius: 8px;
      border-left: 4px solid #5b21b6;
    }
    .features-title {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .features-list {
      margin: 0;
      padding: 0 0 0 20px;
      font-size: 14px;
      color: #374151;
    }
    .features-list li {
      margin-bottom: 8px;
    }
    .cta-section {
      margin: 32px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #5b21b6;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #4c1d95;
    }
    .expiry-notice {
      margin: 20px 0;
      padding: 12px;
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      font-size: 13px;
      color: #78350f;
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
    .footer-divider {
      margin: 0;
      color: #d1d5db;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">You're Invited!</h1>
      <p class="header-subtitle">Join ${org.name}'s placement preparation program</p>
    </div>

    <div class="content">
      <p class="content-text">Hi there,</p>

      <p class="content-text">
        <strong>${org.name}</strong> has invited you to join their campus placement preparation program on <strong>InterviewEra</strong>.
      </p>

      <p class="content-text">
        InterviewEra is an AI-powered mock interview platform designed to help students practice for placements with realistic scenarios and detailed feedback. Your college has provided you with full access to help you succeed in your placement journey.
      </p>

      <div class="features">
        <div class="features-title">What You'll Get:</div>
        <ul class="features-list">
          <li><strong>Unlimited Practice Interviews</strong> — Mock interviews tailored to your profile</li>
          <li><strong>AI-Powered Scoring</strong> — Detailed feedback on communication, technical depth, and confidence</li>
          <li><strong>Progress Tracking</strong> — Monitor your improvement across 5 key dimensions</li>
          <li><strong>Placement-Ready Certification</strong> — Earn badges as you reach milestones</li>
        </ul>
      </div>

      <div class="cta-section">
        <a href="${appUrl}/college/join/${invite.token}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="expiry-notice">
        ⏰ This invitation link expires in 7 days. Accept it soon to get started!
      </div>

      <p class="content-text" style="font-size: 13px; color: #6b7280;">
        Don't have an InterviewEra account yet? No problem! You'll create one when you accept the invitation.
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        This invitation is unique to <strong>${invite.email}</strong>. Please don't share this link with others.
      </p>
      <p class="footer-divider">—</p>
      <p class="footer-text">
        © 2026 InterviewEra. Helping students ace their placements.
      </p>
      <p class="footer-text">
        If you didn't expect this invitation, you can safely ignore this email. Your T&P officer can provide more information about the program.
      </p>
    </div>
  </div>
</body>
</html>`,
          })
        )
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          emailErrors++;
          console.error('[college/bulk-invite] Email send failed:', result.reason);
        }
      }
    }

    return NextResponse.json({
      invited: insertedInvites.length,
      skipped,
      emailErrors,
      message: `${insertedInvites.length} invitation${insertedInvites.length !== 1 ? 's' : ''} sent${emailErrors > 0 ? ` (${emailErrors} email errors)` : ''}.`,
    });
  } catch (err) {
    console.error('[college/bulk-invite] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
