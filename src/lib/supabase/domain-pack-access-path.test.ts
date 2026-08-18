import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Domain pack access-path regression (static)', () => {
  it('interview/new loads active packs through the authenticated server client', () => {
    const page = read('src/app/(dashboard)/interview/new/page.tsx');

    expect(page).toContain("from '@/lib/supabase/server'");
    expect(page).toContain('createClient');
    expect(page).toContain(".from('domain_packs')");
    expect(page).toContain(".eq('is_active', true)");
    expect(page).not.toContain('createServiceClient');
    expect(page).not.toContain("from('domain_pack_questions')");
  });

  it('interview start loads questions only through service-role', () => {
    const route = read('src/app/api/interview/start/route.ts');

    expect(route).toContain('createServiceClient');
    expect(route).toContain('const serviceClient = createServiceClient()');
    expect(route).toMatch(
      /serviceClient\s*\n\s*\.from\('domain_pack_questions'\)/,
    );
    expect(route).not.toMatch(
      /(?:await\s+)?supabase[\s\S]{0,80}\.from\('domain_pack_questions'\)/,
    );
  });

  it('browser StartInterviewForm never queries domain tables directly', () => {
    const form = read('src/app/(dashboard)/interview/new/StartInterviewForm.tsx');

    expect(form).toContain('domainPacks');
    expect(form).toContain('domainPackId');
    expect(form).not.toContain("from('domain_packs')");
    expect(form).not.toContain("from('domain_pack_questions')");
    expect(form).not.toContain('createClient');
    expect(form).not.toContain('createServiceClient');
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
      'supabase/migrations/20260817224413_domain_pack_rls_security_remediation.sql',
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
