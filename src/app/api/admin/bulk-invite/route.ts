import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { getBaseUrl } from '@/lib/server/get-base-url';

const bodySchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
});

export async function POST(request: Request): Promise<NextResponse> {
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

    // ── Fetch campus org ───────────────────────────────────────────────────────
    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, name, seat_count, verification_status')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Campus organization not found' }, { status: 404 });
    }
    if (org.verification_status !== 'approved') {
      return NextResponse.json(
        { error: 'Campus organization is pending verification.' },
        { status: 403 },
      );
    }

    // ── Validate body ──────────────────────────────────────────────────────────
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

    // ── Seat limit check ───────────────────────────────────────────────────────
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

    // ── Skip already-invited or existing emails ────────────────────────────────
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

    // ── Insert invite records ──────────────────────────────────────────────────
    const { data: insertedInvites, error: insertError } = await serviceClient
      .from('campus_invites')
      .insert(toInvite.map((email) => ({ org_id: org.id, email })))
      .select('email, token');

    if (insertError || !insertedInvites) {
      console.error('[bulk-invite] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invites' }, { status: 500 });
    }

    // ── Send invite emails via Resend ──────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = getBaseUrl();
    let emailErrors = 0;

    // Send in batches of 50 to respect Resend rate limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < insertedInvites.length; i += BATCH_SIZE) {
      const batch = insertedInvites.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((invite) => {
          const inviteUrl = `${appUrl}/college/join/${invite.token}`;
          return resend.emails.send({
            from: 'InterviewEra Campus <campus@interviewera.com>',
            to: invite.email,
            subject: `${org.name} has invited you to join InterviewEra`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to InterviewEra</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:20px;font-weight:700;color:#1e293b;letter-spacing:-0.3px;">Interview<span style="color:#2563eb;">Era</span></span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <p style="margin:0 0 24px;font-size:13px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;">${org.name}</p>
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">You're invited to join InterviewEra</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.65;">
                Your T&amp;P department has enrolled you in <strong style="color:#0f172a;">${org.name}</strong>'s
                campus placement preparation program, powered by InterviewEra.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;background-color:#f8fafc;border-radius:8px;padding:20px 20px 12px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f172a;">Your campus plan includes:</p>
                    <p style="margin:0 0 6px;font-size:14px;color:#475569;">&#10003; &nbsp;Unlimited AI mock interviews, tailored to your resume</p>
                    <p style="margin:0 0 6px;font-size:14px;color:#475569;">&#10003; &nbsp;Detailed scoring across 5 performance dimensions</p>
                    <p style="margin:0 0 6px;font-size:14px;color:#475569;">&#10003; &nbsp;Progress tracking and placement-readiness analytics</p>
                    <p style="margin:0 0 0;font-size:14px;color:#475569;">&#10003; &nbsp;Model answer comparison and Improvement Guidance</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:4px 0 24px;">
                    <a href="${inviteUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;color:#64748b;text-align:center;">This invitation expires in <strong>7 days</strong>.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This invitation was sent to <strong>${invite.email}</strong>. If you did not expect this email,
                you can safely ignore it — your account will not be activated unless you click the button above.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; 2026 InterviewEra &nbsp;&middot;&nbsp; AI-powered campus placement preparation
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
          });
        })
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          emailErrors++;
          console.error('[bulk-invite] Email send failed:', result.reason);
        }
      }
    }

    return NextResponse.json({
      invited: insertedInvites.length,
      skipped,
      emailErrors,
      message: `${insertedInvites.length} invitations sent${emailErrors > 0 ? ` (${emailErrors} email errors)` : ''}.`,
    });
  } catch (err) {
    console.error('[bulk-invite] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
