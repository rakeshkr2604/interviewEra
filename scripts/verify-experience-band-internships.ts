/**
 * Prove internship-only resumes band as 0-1; founder/full-time still bands sanely.
 *   npx tsx scripts/verify-experience-band-internships.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { extractText } from '../src/lib/pdf/parser';
import { assertPdfPageLimit } from '../src/lib/pdf/page-count';
import { parseResumeGracefully } from '../src/lib/resume/graceful-parse';

const INTERNSHIP_ONLY = `
Priya Sharma
Software Engineer (Fresher)
Skills: Python, FastAPI, React, OOP, DSA

EXPERIENCE
Software Development Intern — TechNova Pvt Ltd   Jun 2023 – Aug 2023
• Built REST APIs with FastAPI for an internal dashboard.
• Wrote unit tests and fixed production bugs under mentor guidance.

Web Development Intern — Campus Labs   Jan 2024 – May 2024
• Implemented React UI components for a student portal.
• Collaborated with designers on responsive layouts.

EDUCATION
B.Tech Computer Science   2025
National Institute of Technology

PROJECTS
Scalable URL Shortener – Redis-backed short links
• Built with FastAPI and Redis.
`;

async function main() {
  process.env.RESUME_PARSE_FORCE_AI = '1';

  const intern = await parseResumeGracefully(INTERNSHIP_ONLY);

  const pdfPath = resolve(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');
  const bytes = new Uint8Array(readFileSync(pdfPath));
  await assertPdfPageLimit(bytes, 10);
  const text = await extractText(bytes, { source: 'verify-exp-band-founder' });
  const founder = await parseResumeGracefully(text);

  const report = {
    internshipOnly: {
      stage: intern.stage,
      experience_estimate: intern.data.experience_estimate,
      experience: intern.data.experience,
      ok: /^(0-1 years|Fresher)/i.test(intern.data.experience_estimate),
    },
    founderFullTime: {
      stage: founder.stage,
      experience_estimate: founder.data.experience_estimate,
      experience: founder.data.experience,
      // Must NOT be forced to empty; founder role should remain a professional entry
      hasProfessionalRole: (founder.data.experience ?? []).some((e) =>
        /founder|full.?stack|developer/i.test(e.title),
      ),
      ok: !/^(3-5 years|5\+ years)$/i.test(founder.data.experience_estimate),
    },
    at: new Date().toISOString(),
  };

  const outDir = resolve(process.cwd(), '.verify-out', 'experience-band');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!report.internshipOnly.ok || !report.founderFullTime.ok) {
    console.error('[verify-experience-band] FAIL');
    process.exit(1);
  }
  console.log('[verify-experience-band] ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
