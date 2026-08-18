import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sql = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '092_p0_email_service_role_grants_without_default_privileges.sql',
  ),
  'utf8',
);

describe('P0 email service_role grants without default privileges', () => {
  it('does not alter default privileges', () => {
    expect(sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')).not.toMatch(
      /ALTER DEFAULT PRIVILEGES/i,
    );
  });

  it('revokes browser roles and grants service_role table ops', () => {
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE public.email_preferences TO service_role;');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE public.lifecycle_email_log TO service_role;');
  });
});
