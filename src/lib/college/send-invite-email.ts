import { Resend } from 'resend';
import { getBaseUrl } from '@/lib/server/get-base-url';

export async function sendCampusInviteEmail(params: {
  email: string;
  token: string;
  orgName: string;
}): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = getBaseUrl();

  const { error } = await resend.emails.send({
    from: 'InterviewEra <noreply@interviewera.com>',
    to: params.email,
    subject: `You're invited to join ${params.orgName} on InterviewEra`,
    html: `<!DOCTYPE html>
<html><body style="font-family:sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <h1 style="font-size:24px;">You're Invited!</h1>
    <p><strong>${params.orgName}</strong> has invited you to join their campus placement program on InterviewEra.</p>
    <p style="margin:24px 0;">
      <a href="${appUrl}/college/join/${params.token}" style="display:inline-block;padding:12px 24px;background:#5b21b6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Accept Invitation</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">This invitation expires in 7 days.</p>
  </div>
</body></html>`,
  });

  if (error) {
    console.error('[college/invite-email] Send failed:', error);
    return false;
  }

  return true;
}
