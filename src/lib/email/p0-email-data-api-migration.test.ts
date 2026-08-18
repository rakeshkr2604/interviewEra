import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationName = '20260817165144_p0_email_data_api_security_remediation.sql';
const migrationPath = path.join(root, 'supabase', 'migrations', migrationName);
const sql = fs.readFileSync(migrationPath, 'utf8');
const normalizedSql = sql.replace(/\s+/g, ' ').trim();

const tables = [
  'email_preferences',
  'email_events',
  'email_jobs',
  'email_logs',
  'email_opens',
  'email_clicks',
  'email_metrics',
  'lifecycle_email_log',
] as const;

const expectedServiceGrants: Record<(typeof tables)[number], string[]> = {
  email_preferences: ['SELECT', 'INSERT', 'UPDATE'],
  email_events: ['SELECT', 'INSERT', 'UPDATE'],
  email_jobs: ['SELECT', 'INSERT', 'UPDATE'],
  email_logs: ['INSERT'],
  email_opens: ['INSERT'],
  email_clicks: ['INSERT'],
  email_metrics: ['SELECT'],
  lifecycle_email_log: ['SELECT', 'INSERT', 'UPDATE'],
};

const historicalHashes = {
  '037_email_automation_engine.sql':
    '92a2199492fc449c11b37a0a4bac69766b1ec5d44fe9f43ebf881e12f288ec27',
  '046_lifecycle_email_log.sql':
    'f4c6113f7d90358210ccfbfbe4676fc8a95c11c193d35b03a3772fae111b4261',
  '047_lifecycle_email_log_grants.sql':
    '527ef6dd0074aecc17d8a7fd0e7e38e440ca5f7b52896edf8cb6ad746e0d8fb9',
  '056_fix_resume_snapshot_cascade.sql':
    '0e66c34adc3d5682e1d6aba96a84186ae543150cc17dee86c5d791942cb745d2',
  '057_fix_auth_rls_initplan.sql':
    '7c3ce5459f583b72a527620b7b9f02a7b3a96d0736b9d2e210e1c8376f303f06',
  '058_add_missing_fk_indexes.sql':
    'e8fc5dcab6ea236ee224d69497d904da1d832f98503160eced70e8cf4ab91545',
  '070_draft_remove_duplicate_script_turns_interview_turn_index.sql':
    '99a58da4d54ed826c8df20f35a4db0e3ffa8c194c8ddec40805b2e2e8a2dd9ba',
  '071_draft_remove_duplicate_answer_evaluations_interview_index.sql':
    '41db3a2b1bd5f1963ea172b441a34c148a689044f65dc60c7a0b11cd2ff849b5',
} as const;

describe('P0 email Data API security migration', () => {
  it('runs after the historical-order reconciliation migration', () => {
    expect(migrationName.localeCompare('20260817162058_reconcile_historical_migration_order.sql'))
      .toBeGreaterThan(0);
  });

  it('enables RLS on all eight internal email tables', () => {
    for (const table of tables) {
      expect(normalizedSql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
      );
    }
  });

  it('revokes existing client and service grants before granting the exact service contract', () => {
    const revoke = normalizedSql.match(
      /REVOKE ALL ON TABLE ([\s\S]*?) FROM PUBLIC, anon, authenticated, service_role;/,
    )?.[1];

    expect(revoke).toBeDefined();
    for (const table of tables) {
      expect(revoke).toContain(`public.${table}`);
    }

    const grants = [
      ...normalizedSql.matchAll(
        /GRANT ([A-Z, ]+) ON TABLE public\.([a-z_]+) TO service_role;/g,
      ),
    ];
    expect(grants).toHaveLength(tables.length);

    for (const [, privileges, table] of grants) {
      expect(tables).toContain(table as (typeof tables)[number]);
      expect(privileges.split(',').map((value) => value.trim())).toEqual(
        expectedServiceGrants[table as (typeof tables)[number]],
      );
      expect(privileges).not.toContain('DELETE');
    }
  });

  it('creates no client policy and grants clients no table privilege', () => {
    expect(sql).not.toMatch(/\bCREATE\s+POLICY\b/i);
    expect(sql).not.toMatch(
      /\bGRANT\b[\s\S]*?\bON\s+TABLE\b[\s\S]*?\bTO\s+(?:PUBLIC|anon|authenticated)\b/i,
    );
  });

  it('hardens postgres public defaults for tables, sequences, and functions', () => {
    expect(normalizedSql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;',
    );
    expect(normalizedSql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;',
    );
    expect(normalizedSql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;',
    );
    expect(sql).not.toMatch(/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i);
  });

  it('does not modify unrelated tables', () => {
    const referencedTables = [
      ...normalizedSql.matchAll(/\bpublic\.([a-z_]+)\b/g),
    ].map((match) => match[1]);

    expect(new Set(referencedTables)).toEqual(new Set(tables));
  });

  it('preserves protected historical migration contents', () => {
    for (const [file, expectedHash] of Object.entries(historicalHashes)) {
      const contents = fs.readFileSync(
        path.join(root, 'supabase', 'migrations', file),
        'utf8',
      );
      const normalizedContents = contents.replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(normalizedContents).digest('hex')).toBe(
        expectedHash,
      );
    }
  });
});
