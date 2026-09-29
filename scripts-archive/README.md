# Archived scripts

Not wired into `package.json`/CI. Kept as a sibling of `scripts/` (not nested under it) so each script's `../src/...` and `__dirname`-relative paths keep resolving correctly without any code changes. Each still works as-is.

- `deployment-audit.ts` — pre-deployment SEO/link integrity audit. Run: `npx tsx scripts-archive/deployment-audit.ts`
- `full-seo-audit.ts` — full-site indexing audit across the programmatic SEO surface. Run: `npx tsx scripts-archive/full-seo-audit.ts`
- `gsc-audit-mapper.ts` — merges GSC CSV exports + crawl + registry into an audit table. Place exports in `scripts-archive/gsc-exports/*.csv`. Run: `npx tsx scripts-archive/gsc-audit-mapper.ts`
- `gsc-authoritative-audit.ts` — authoritative GSC drill-down indexing audit. Place exports in `scripts/gsc-exports/` or `docs/interviewera.com-Coverage-*/`. Run: `npx tsx scripts-archive/gsc-authoritative-audit.ts`
- `validate-agentic-links.ts` — validates internal hrefs for the Agentic AI content cluster. Run: `npx tsx scripts-archive/validate-agentic-links.ts`
- `validate-seo-metadata.ts` — validates SEO title/description lengths from codebase metadata. Run: `npx tsx scripts-archive/validate-seo-metadata.ts`
- `generate-react-hub-images.mjs` — converts committed premium PNG blog images to WebP. Run: `node scripts-archive/generate-react-hub-images.mjs`
- `voice-app-verify.mjs` — real-mic, headed-Chrome voice runtime verification on localhost. Run: `node scripts-archive/voice-app-verify.mjs`
- `voice-interview-verify.mjs` — **HISTORICAL / BROKEN against current code** (calls deleted `/api/interview/start` + `/interview/session/...`). Kept only as archive evidence; do not run against V2.1.
