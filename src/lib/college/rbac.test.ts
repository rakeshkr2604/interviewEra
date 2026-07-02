import { describe, expect, it } from 'vitest';
import { getEffectiveInviteStatus } from './invites';
import { hasCampusPermission, resolveCampusRole } from './rbac';

describe('campus rbac', () => {
  it('maps campus_admin plan tier to campus_admin role', () => {
    expect(resolveCampusRole('campus_admin')).toBe('campus_admin');
    expect(resolveCampusRole('free')).toBeNull();
  });

  it('grants invite management to campus_admin', () => {
    expect(hasCampusPermission('campus_admin', 'invites:manage')).toBe(true);
    expect(hasCampusPermission('recruiter', 'invites:manage')).toBe(false);
  });
});

describe('invite status', () => {
  it('returns expired for past expiry on pending invite', () => {
    expect(
      getEffectiveInviteStatus({
        status: 'pending',
        expires_at: '2020-01-01T00:00:00.000Z',
      })
    ).toBe('expired');
  });

  it('returns pending for future expiry', () => {
    expect(
      getEffectiveInviteStatus({
        status: 'pending',
        expires_at: '2099-01-01T00:00:00.000Z',
      })
    ).toBe('pending');
  });
});
