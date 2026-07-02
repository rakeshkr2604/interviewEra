import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  resolveCampusOrgVerificationStatus,
  shouldAutoApproveCampusOrg,
} from './org-verification';

describe('org-verification', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.CAMPUS_WORKSPACE_AUTO_APPROVE;
    delete process.env.CAMPUS_ORG_APPROVED_EMAILS;
  });

  afterEach(() => {
    process.env = env;
  });

  it('defaults to pending without allowlist', () => {
    expect(shouldAutoApproveCampusOrg('admin@college.edu')).toBe(false);
    expect(resolveCampusOrgVerificationStatus('admin@college.edu')).toBe('pending');
  });

  it('auto-approves when CAMPUS_WORKSPACE_AUTO_APPROVE=true', () => {
    process.env.CAMPUS_WORKSPACE_AUTO_APPROVE = 'true';
    expect(shouldAutoApproveCampusOrg('any@example.com')).toBe(true);
    expect(resolveCampusOrgVerificationStatus('any@example.com')).toBe('approved');
  });

  it('auto-approves allowlisted emails', () => {
    process.env.CAMPUS_ORG_APPROVED_EMAILS = 'pilot@college.edu, Other@School.IN ';
    expect(shouldAutoApproveCampusOrg('pilot@college.edu')).toBe(true);
    expect(shouldAutoApproveCampusOrg('other@school.in')).toBe(true);
    expect(shouldAutoApproveCampusOrg('random@example.com')).toBe(false);
  });
});
