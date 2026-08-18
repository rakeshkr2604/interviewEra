import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '093_drop_domain_pack_public_read_keep_policies.sql',
  ),
  'utf8',
);

describe('domain pack keep-policy drop follow-on', () => {
  it('requires the 091 replacement policy before dropping USING true keep policies', () => {
    expect(sql).toContain("policyname = 'domain_packs_authenticated_select_active'");
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public read domain_packs"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public read domain_pack_questions"');
  });
});
