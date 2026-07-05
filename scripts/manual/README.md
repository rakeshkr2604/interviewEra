# Manual scripts

Not wired into `package.json`/CI — run by hand when needed. Each still works as-is (no code changes made on move).

- `launch-verification.ts` — production launch readiness checklist (env/health/crons/migrations). Run: `npx tsx scripts/manual/launch-verification.ts [--base-url ...]`
- `email-runtime-validation.ts` — end-to-end email lifecycle QA against local dev + Supabase. Run: `npx tsx scripts/manual/email-runtime-validation.ts [--base-url ...]`
- `manual-test-orchestrator.ts` — manual dry-run/live probe for the dual-agent interview orchestrator. Run: `npx tsx scripts/manual/manual-test-orchestrator.ts --dry-run`
- `release-seo-check.mjs` — pre-release SEO smoke check (canonical/JSON-LD/robots/sitemap). Run: `node scripts/manual/release-seo-check.mjs`
- `release-web-vitals.mjs` — pre-release Core Web Vitals capture. Run: `node scripts/manual/release-web-vitals.mjs`
