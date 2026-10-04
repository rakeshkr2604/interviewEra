import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) };
  },
}));

import { sendCampusInviteEmails } from '@/lib/college/bulk-invite-send';

describe('sendCampusInviteEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_test');
  });

  it('counts provider-accepted responses', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const r = await sendCampusInviteEmails({
      invites: [
        { email: 'a@x.com', token: 't1' },
        { email: 'b@x.com', token: 't2' },
      ],
      from: 'InterviewEra <noreply@interviewera.com>',
      subjectFor: () => 'Invite',
      htmlFor: () => '<p>hi</p>',
      logPrefix: '[test]',
    });
    expect(r.accepted).toBe(2);
    expect(r.emailErrors).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('treats Resend error objects as failures (not only thrown rejects)', async () => {
    sendMock
      .mockResolvedValueOnce({ data: null, error: { message: 'rate_limit' } })
      .mockRejectedValueOnce(new Error('network'));
    const r = await sendCampusInviteEmails({
      invites: [
        { email: 'a@x.com', token: 't1' },
        { email: 'b@x.com', token: 't2' },
      ],
      from: 'InterviewEra <noreply@interviewera.com>',
      subjectFor: () => 'Invite',
      htmlFor: () => '<p>hi</p>',
      logPrefix: '[test]',
    });
    expect(r.accepted).toBe(0);
    expect(r.emailErrors).toBe(2);
  });

  it('does not send when API key missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const r = await sendCampusInviteEmails({
      invites: [{ email: 'a@x.com', token: 't1' }],
      from: 'x',
      subjectFor: () => 's',
      htmlFor: () => 'h',
      logPrefix: '[test]',
    });
    expect(r.emailErrors).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
