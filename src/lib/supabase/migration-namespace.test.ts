import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = path.resolve(process.cwd(), 'supabase/migrations');
const serialName = /^(\d{3,})_([a-z0-9_]+)\.sql$/;
const timestampName = /^\d{14}_/;

describe('migration namespace', () => {
  const files = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql'));

  it('contains only serial NNN_name.sql files', () => {
    const invalid = files.filter((name) => !serialName.test(name) || timestampName.test(name));
    expect(invalid).toEqual([]);
  });

  it('has unique serial versions', () => {
    const versions = files.map((name) => serialName.exec(name)?.[1]);
    expect(versions.every(Boolean)).toBe(true);
    expect(new Set(versions).size).toBe(files.length);
  });

  it('keeps the remapped 202608 follow-ons at 092 and 093', () => {
    expect(files).toContain(
      '092_p0_email_service_role_grants_without_default_privileges.sql',
    );
    expect(files).toContain('093_drop_domain_pack_public_read_keep_policies.sql');
  });

  it('records the Production interview_turns orphan as serial 094', () => {
    expect(files).toContain('094_interview_turns.sql');
  });
});
