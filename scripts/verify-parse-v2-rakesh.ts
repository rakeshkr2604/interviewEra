/**
 * Run Rakesh fixture through parse-v2 (AI when keyed, else heuristic) and report sections.
 *   npx tsx scripts/verify-parse-v2-rakesh.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { extractText } from '../src/lib/pdf/parser';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';
import { parseResumeGracefully } from '../src/lib/resume/graceful-parse';
import { canonicalizeSkills } from '../src/lib/resume/skill-canonicalize';
import { buildScriptResumeSummary } from '../src/lib/interview/question-gen-input';
import { RESUME_PARSER_VERSION } from '../src/lib/resume/parser-version';

async function main() {
  const pdfPath = resolve(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');
  const bytes = new Uint8Array(readFileSync(pdfPath));
  await assertPdfPageLimit(bytes, 10);
  const text = await extractText(bytes, { source: 'verify-parse-v2-rakesh' });

  process.env.RESUME_PARSE_FORCE_AI = process.env.RESUME_PARSE_FORCE_AI ?? '1';
  const result = await parseResumeGracefully(text);
  const skills = canonicalizeSkills(result.data.skills);
  const summary = buildScriptResumeSummary(result.data, result.data.target_role);

  const report = {
    parserVersion: RESUME_PARSER_VERSION,
    stage: result.stage,
    quality: result.quality,
    target_role: result.data.target_role,
    experience_estimate: result.data.experience_estimate,
    skills: skills.map((s) => s.canonical),
    experience: result.data.experience ?? [],
    education: result.data.education ?? [],
    projects: result.data.projects ?? [],
    sections_missing: result.data.sections_missing,
    scriptResumeSummary: summary,
    at: new Date().toISOString(),
  };

  const outDir = resolve(process.cwd(), '.verify-out', 'parse-v2-rakesh');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const ok =
    report.projects.length > 0 &&
    /InterviewEra|SkillBridge/i.test(report.projects.map((p) => p.name).join(' ')) &&
    /InterviewEra|SkillBridge/i.test(summary);
  if (!ok) {
    console.error('[verify-parse-v2-rakesh] FAIL — expected project grounding in parse + summary');
    process.exit(1);
  }
  console.log('[verify-parse-v2-rakesh] ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
