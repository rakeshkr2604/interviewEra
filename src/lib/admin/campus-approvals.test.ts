import { describe, expect, it } from 'vitest';
import {
  campusReviewErrorStatus,
  deriveOrganizationDomain,
  isCampusReviewSchemaUnavailable,
} from '@/lib/admin/campus-approvals';

describe('campus approvals helpers', () => {
  it('derives the review domain without exposing extra account data', () => {
    expect(deriveOrganizationDomain('office@college.edu', 'admin@example.com')).toBe('college.edu');
    expect(deriveOrganizationDomain(null, 'admin@example.com')).toBe('example.com');
    expect(deriveOrganizationDomain(null, null)).toBeNull();
  });

  it.each(['PGRST202', 'PGRST205', '42P01'])(
    'recognizes missing review schema code %s',
    (code) => {
      expect(isCampusReviewSchemaUnavailable(code)).toBe(true);
      expect(campusReviewErrorStatus('schema unavailable', code)).toBe(503);
    },
  );

  it('does not classify unrelated database errors as migration availability', () => {
    expect(isCampusReviewSchemaUnavailable('42501')).toBe(false);
    expect(campusReviewErrorStatus('permission denied', '42501')).toBe(500);
  });
});
