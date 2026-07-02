import type { InviteStatus } from './types';

export function getEffectiveInviteStatus(invite: {
  status: string;
  expires_at?: string | null;
}): InviteStatus {
  if (invite.status === 'revoked' || invite.status === 'accepted') {
    return invite.status as InviteStatus;
  }

  if (invite.status === 'expired') {
    return 'expired';
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return 'expired';
  }

  return 'pending';
}

export function inviteExpiryDate(from = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + 7);
  return expires.toISOString();
}
