import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { z } from 'zod';

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
      .select('id, name, seat_count')
      .eq('admin_user_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Campus organization not found' }, { status: 404 });
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://interviewera.com';
    let emailErrors = 0;

    // Send in batches of 50 to respect Resend rate limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < insertedInvites.length; i += BATCH_SIZE) {
      const batch = insertedInvites.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((invite) =>
          resend.emails.send({
            from: 'InterviewEra Campus <campus@interviewera.com>',
            to: invite.email,
            subject: `You've been invited to InterviewEra by ${org.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
                <h2 style="margin-bottom:8px">You&apos;re invited to InterviewEra</h2>
                <p style="color:#555">
                  <strong>${org.name}</strong> has invited you to InterviewEra — an AI-powered
                  mock interview platform in private beta, built for structured campus and internship prep.
                </p>
                <p style="color:#555">
                  Your campus plan gives you <strong>unlimited practice interviews</strong>
                  with detailed AI feedback.
                </p>
                <a
                  href="${appUrl}/join?token=${invite.token}"
                  style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"
                >
                  Accept Invitation
                </a>
                <p style="margin-top:24px;font-size:12px;color:#999">
                  This link is unique to your email. Do not share it.
                </p>
              </div>
            `,
          })
        )
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
