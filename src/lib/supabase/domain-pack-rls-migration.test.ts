import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationName = '091_domain_pack_rls_security_remediation.sql';
const priorMigration = '090_p0_email_data_api_security_remediation.sql';
const migrationPath = path.join(root, 'supabase', 'migrations', migrationName);
const sql = fs.readFileSync(migrationPath, 'utf8');
const normalizedSql = sql.replace(/\s+/g, ' ').trim();

const tables = ['domain_packs', 'domain_pack_questions'] as const;

const protectedHashes = {
  '004_domain_packs.sql':
    '35018c95c0b2ef90087d2fda137cf5f189e38b33be6c9f6139b7218552326692',
  '068_remove_exact_duplicate_domain_pack_read_policies.sql':
    'b831ee952db099017fa4c522e614d748e093d55fc9b36b8fbc9a2d524293f765',
  [priorMigration]:
    'f7b7328cca215971d96242b618808e2989deca83790081a15c86cebeeaf006b8',
} as const;

function sha256File(relativePath: string): string {
  const contents = fs
    .readFileSync(path.join(root, 'supabase', 'migrations', relativePath), 'utf8')
    .replace(/\r\n/g, '\n');
  return createHash('sha256').update(contents).digest('hex');
}

describe('Domain pack RLS security migration', () => {
  it('runs after the P0 email Data API remediation migration', () => {
    expect(migrationName.localeCompare(priorMigration)).toBeGreaterThan(0);
  });

  it('revokes all existing privileges on both tables before re-granting', () => {
    const revoke = normalizedSql.match(
      /REVOKE ALL ON TABLE ([\s\S]*?) FROM PUBLIC, anon, authenticated, service_role;/,
    )?.[1];

    expect(revoke).toBeDefined();
    for (const table of tables) {
      expect(revoke).toContain(`public.${table}`);
    }
  });

  it('enables RLS on both domain-pack tables', () => {
    for (const table of tables) {
      expect(normalizedSql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
      );
    }
  });

  it('grants authenticated SELECT-only on domain_packs and no other client table grants', () => {
    expect(normalizedSql).toContain(
      'GRANT SELECT ON TABLE public.domain_packs TO authenticated;',
    );

    const authGrants = [
      ...normalizedSql.matchAll(
        /GRANT ([A-Z, ]+) ON TABLE public\.([a-z_]+) TO authenticated;/g,
      ),
    ];
    expect(authGrants).toHaveLength(1);
    expect(authGrants[0]?.[1]).toBe('SELECT');
    expect(authGrants[0]?.[2]).toBe('domain_packs');

    const grantStatements = [
      ...normalizedSql.matchAll(
        /GRANT ([A-Z, ]+) ON TABLE public\.([a-z_]+) TO ([a-z_]+);/g,
      ),
    ].map(([, privileges, table, role]) => ({ privileges, table, role }));

    expect(
      grantStatements.filter(
        (grant) =>
          grant.table === 'domain_packs' &&
          (grant.role === 'anon' || grant.role === 'public'),
      ),
    ).toEqual([]);
    expect(
      grantStatements.filter((grant) => grant.table === 'domain_pack_questions'),
    ).toEqual([
      {
        privileges: 'SELECT, INSERT, UPDATE',
        table: 'domain_pack_questions',
        role: 'service_role',
      },
    ]);
  });

  it('grants service_role SELECT/INSERT/UPDATE only on both tables', () => {
    const serviceGrants = [
      ...normalizedSql.matchAll(
        /GRANT ([A-Z, ]+) ON TABLE public\.([a-z_]+) TO service_role;/g,
      ),
    ];

    expect(serviceGrants).toHaveLength(2);
    expect(
      Object.fromEntries(
        serviceGrants.map(([, privileges, table]) => [
          table,
          privileges.split(',').map((value) => value.trim()),
        ]),
      ),
    ).toEqual({
      domain_packs: ['SELECT', 'INSERT', 'UPDATE'],
      domain_pack_questions: ['SELECT', 'INSERT', 'UPDATE'],
    });

    for (const [, privileges] of serviceGrants) {
      expect(privileges).not.toContain('DELETE');
      expect(privileges).not.toContain('TRUNCATE');
      expect(privileges).not.toContain('REFERENCES');
      expect(privileges).not.toContain('TRIGGER');
      expect(privileges).not.toContain('ALL');
    }
  });

  it('creates exactly one authenticated active-pack SELECT policy without USING(true)', () => {
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS domain_packs_authenticated_select_active ON public\.domain_packs;/,
    );

    const policies = [
      ...sql.matchAll(/\bCREATE\s+POLICY\s+([a-z_]+)\b/gi),
    ].map((match) => match[1]);
    expect(policies).toEqual(['domain_packs_authenticated_select_active']);

    expect(normalizedSql).toContain(
      'CREATE POLICY domain_packs_authenticated_select_active ON public.domain_packs FOR SELECT TO authenticated USING (is_active IS TRUE);',
    );

    const policyBodies = [
      ...sql.matchAll(/CREATE\s+POLICY[\s\S]*?;/gi),
    ].map((match) => match[0]);
    expect(policyBodies).toHaveLength(1);
    expect(policyBodies[0]).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(policyBodies[0]).toMatch(/USING\s*\(\s*is_active\s+IS\s+TRUE\s*\)/i);
  });

  it('creates no client policies on domain_pack_questions', () => {
    expect(sql).not.toMatch(
      /CREATE\s+POLICY[\s\S]*?ON\s+public\.domain_pack_questions/i,
    );
  });

  it('only touches the two domain-pack tables', () => {
    const referencedTables = [
      ...normalizedSql.matchAll(/\bpublic\.([a-z_]+)\b/g),
    ].map((match) => match[1]);

    expect(new Set(referencedTables)).toEqual(new Set(tables));
  });

  it('preserves protected historical migrations and the email P0 remediation', () => {
    for (const [file, expectedHash] of Object.entries(protectedHashes)) {
      expect(sha256File(file)).toBe(expectedHash);
    }
  });
});
