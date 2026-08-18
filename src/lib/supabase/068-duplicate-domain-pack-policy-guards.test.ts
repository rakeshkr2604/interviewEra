import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/068_remove_exact_duplicate_domain_pack_read_policies.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('068 duplicate domain pack read policy guard', () => {
  it('keeps the exact retained and duplicate policy names', () => {
    expect(sql).toContain("WHEN 'domain_packs' THEN 'Allow public read domain_packs'");
    expect(sql).toContain("'Allow public read domain_pack_questions'");
    expect(sql).toContain("duplicate_policy text := 'public read packs'");
  });

  it('no-ops on a fresh schema where neither policy exists', () => {
    expect(sql).toContain('IF NOT keep_matches THEN');
    expect(sql).toContain('IF NOT duplicate_named THEN');
    expect(sql).toContain('are absent; no cleanup needed');
    expect(sql).toContain('CONTINUE;');
  });

  it('still refuses cleanup when the keep policy is missing but a duplicate remains', () => {
    expect(sql).toContain(
      'expected retained policy "%" on public.% is absent or changed while duplicate "%" still exists',
    );
  });

  it('drops only the exact duplicate shape and refuses a renamed/changed duplicate', () => {
    expect(sql).toContain('IF duplicate_matches THEN');
    expect(sql).toContain("'DROP POLICY %I ON public.%I'");
    expect(sql).toContain('duplicate policy "%" on public.% has changed');
  });
});
