/**
 * Generate a minimal Type1/WinAnsi PDF that mimics common LaTeX resume font packaging.
 *
 *   node scripts/generate-latex-like-pdf-fixture.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, '../tests/fixtures/pdf/fixture-latex-type1.pdf');

const lines = [
  'Software Engineer',
  'Skills: React, NodeJS, TypeScript, PostgreSQL',
  'Experience: Built office tools and interview platforms',
  'Education: B.Tech Computer Science',
  'Projects: Mock interview SaaS with Next.js',
];

const ops = ['BT', '/F1 12 Tf', '50 750 Td', '16 TL'];
for (const line of lines) {
  const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  ops.push(`(${escaped}) Tj`, 'T*');
}
ops.push('ET');
const stream = `${ops.join('\n')}\n`;

const objs = {
  1: '<< /Type /Catalog /Pages 2 0 R >>',
  2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  4: `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  6: '<< /Producer (InterviewEra fixture Type1/WinAnsi LaTeX-like) /Creator (generate-latex-like-pdf-fixture.mjs) >>',
};

let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
const offsets = { 0: 0 };
for (let i = 1; i <= 6; i++) {
  offsets[i] = Buffer.byteLength(body);
  body += `${i} 0 obj\n${objs[i]}\nendobj\n`;
}

const xrefStart = Buffer.byteLength(body);
let xref = `xref\n0 7\n0000000000 65535 f \n`;
for (let i = 1; i <= 6; i++) {
  xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
const trailer = `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
const pdf = body + xref + trailer;
writeFileSync(out, pdf);
console.log('wrote', out, 'bytes', Buffer.byteLength(pdf));
