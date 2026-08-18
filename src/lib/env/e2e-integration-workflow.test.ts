import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github', 'workflows', 'e2e-integration.yml'),
  'utf8',
);

describe('staging E2E workflow contract', () => {
  it('binds the manual integration job to the staging environment', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/environment:\s*staging/);
  });

  it('injects the certified staging identity and source mode', () => {
    expect(workflow).toMatch(/APP_ENV:\s*staging/);
    expect(workflow).toMatch(
      /EXPECTED_SUPABASE_PROJECT_REF:\s*iiowrzfwemaxytbykjrg/,
    );
    expect(workflow).toMatch(/STAGING_ENV_SOURCE:\s*injected/);
  });

  it('uses the fail-closed staging command instead of the legacy integration command', () => {
    expect(workflow).toContain('npm run test:e2e:staging');
    expect(workflow).not.toContain('npm run test:e2e:integration');
    expect(workflow).toContain("loadSafeStagingEnvironment({ type: 'injected' })");
  });

  it('explicitly rejects the production Supabase project', () => {
    expect(workflow).toContain('plfuvgkycmxcyshrgpgv');
    expect(workflow).toContain('Production Supabase is forbidden');
  });

  it('keeps email and LLM execution disabled', () => {
    expect(workflow).toMatch(/ALLOW_STAGING_EMAIL:\s*'false'/);
    expect(workflow).toMatch(/STAGING_LLM_MODE:\s*disabled/);
    expect(workflow).not.toContain('RESEND_API_KEY');
    expect(workflow).not.toContain('OPENROUTER_API_KEY');
    expect(workflow).not.toContain('OPENAI_API_KEY');
  });

  it('uses staging-prefixed secrets and has no generic repository-secret fallback', () => {
    expect(workflow).toContain('secrets.STAGING_NEXT_PUBLIC_SUPABASE_URL');
    expect(workflow).toContain('secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('secrets.STAGING_E2E_TEST_EMAIL');
    expect(workflow).not.toMatch(/secrets\.NEXT_PUBLIC_SUPABASE_/);
    expect(workflow).not.toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('secrets.E2E_TEST_EMAIL');
    expect(workflow).not.toContain('secrets.E2E_TEST_PASSWORD');
  });

  it('does not load local, production, or unknown Redis configuration', () => {
    expect(workflow).not.toContain('.env.local');
    expect(workflow).not.toContain('.env.production');
    expect(workflow).not.toContain('UPSTASH_REDIS_REST_URL');
    expect(workflow).not.toContain('UPSTASH_REDIS_REST_TOKEN');
  });

  it('requires an environment-scoped staging app URL and rejects production hosts', () => {
    expect(workflow).toContain('vars.STAGING_NEXT_PUBLIC_APP_URL');
    expect(workflow).toContain('Production application URL is forbidden');
  });
});
