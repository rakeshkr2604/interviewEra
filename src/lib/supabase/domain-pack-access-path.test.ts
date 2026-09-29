import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Domain pack access-path regression (static)', () => {
  it('script interview start does not query domain pack tables', () => {
    const page = read('src/app/(dashboard)/interview/script/start/page.tsx');
    const route = read('src/app/api/interview/script/start/route.ts');

    expect(page).not.toContain("from('domain_packs')");
    expect(page).not.toContain("from('domain_pack_questions')");
    expect(route).not.toContain("from('domain_packs')");
    expect(route).not.toContain("from('domain_pack_questions')");
  });

  it('legacy /interview/new redirects to script start (no domain pack queries)', () => {
    const page = read('src/app/(dashboard)/interview/new/page.tsx');

    expect(page).toContain('SCRIPT_INTERVIEW_START_PATH');
    expect(page).toContain('redirect');
    expect(page).not.toContain("from('domain_packs')");
    expect(page).not.toContain("from('domain_pack_questions')");
  });

  it('SEO question registries do not depend on domain pack tables', () => {
    const questionsLib = read('src/lib/seo/programmatic/questions.ts');
    expect(questionsLib).toContain('STATIC, CURATED content');
    expect(questionsLib).not.toContain('domain_packs');
    expect(questionsLib).not.toContain('domain_pack_questions');
    expect(questionsLib).not.toContain('createClient');
    expect(questionsLib).not.toContain('createServiceClient');
  });

  it('migration contract keeps inactive packs and question rubrics off the client Data API', () => {
    const migration = read(
      'supabase/migrations/091_domain_pack_rls_security_remediation.sql',
    );

    expect(migration).toContain('USING (is_active IS TRUE)');
    const policyBodies = [
      ...migration.matchAll(/CREATE\s+POLICY[\s\S]*?;/gi),
    ].map((match) => match[0]);
    expect(policyBodies).toHaveLength(1);
    expect(policyBodies[0]).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.domain_packs TO authenticated;',
    );
    expect(migration).not.toContain(
      'GRANT SELECT ON TABLE public.domain_pack_questions TO authenticated;',
    );
    expect(migration).not.toContain(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.domain_pack_questions TO authenticated;',
    );
    expect(migration).not.toMatch(
      /CREATE\s+POLICY[\s\S]*ON\s+public\.domain_pack_questions/i,
    );
  });
});
