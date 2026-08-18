import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = path.resolve(process.cwd(), 'supabase/migrations');

function readMigration(name: string): string {
  return fs.readFileSync(path.join(migrationsDirectory, name), 'utf8');
}

function executableSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

const historicalMigrations = [
  '056_fix_resume_snapshot_cascade.sql',
  '057_fix_auth_rls_initplan.sql',
  '058_add_missing_fk_indexes.sql',
] as const;

const reconciliationMigration =
  '20260817162058_reconcile_historical_migration_order.sql';

describe('historical migration order reconciliation', () => {
  it('keeps 056-058 as no-ops for a fresh replay', () => {
    for (const name of historicalMigrations) {
      expect(executableSql(readMigration(name)).trim()).toBe('');
    }
  });

  it('runs the reconciliation after every timestamped dependency', () => {
    const migrationNames = fs
      .readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    expect(migrationNames.indexOf(reconciliationMigration)).toBeGreaterThan(
      migrationNames.indexOf('20260817065517_phase7a_payment_activation_recovery.sql'),
    );
    expect(migrationNames.indexOf(reconciliationMigration)).toBeGreaterThan(
      migrationNames.indexOf('20260718000001_resume_versions_and_snapshots.sql'),
    );
  });

  it('reconciles the deferred FK, indexes, and RLS initplan wrapping', () => {
    const sql = readMigration(reconciliationMigration);

    expect(sql).toContain('ALTER TABLE public.resume_interview_snapshots');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).toContain('idx_answer_evaluations_user_id');
    expect(sql).toContain('idx_resume_interview_snapshots_resume_version_id');
    expect(sql).toContain('idx_resumes_current_version_id');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION pg_temp.ie_wrap_rls_initplan');
    expect(sql).toContain("WHERE n.nspname IN ('public', 'storage')");
    expect(sql).toContain('DROP FUNCTION IF EXISTS pg_temp.ie_wrap_rls_initplan(text)');
  });
});
