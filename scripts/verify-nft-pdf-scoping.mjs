// Build-artifact regression: PDF assets must not appear in unrelated serverless NFTs.
// Requires a fresh `npm run build` (.next present).
// Usage: node scripts/verify-nft-pdf-scoping.mjs

import fs from 'node:fs';
import path from 'node:path';

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function isPdfRoute(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  return (
    /resume\/upload/.test(rel) ||
    /job-description\/extract/.test(rel) ||
    /ats-checker/.test(rel)
  );
}

function hasPdfHeavyAssets(files) {
  const norm = files.map((f) => f.replace(/\\/g, '/'));
  return {
    standardFonts: norm.some((f) => f.includes('pdfjs-dist/standard_fonts')),
    cmaps: norm.some((f) => f.includes('pdfjs-dist/cmaps')),
    pdfParse: norm.some((f) => f.includes('pdf-parse')),
    canvasPkg: norm.some((f) => /@napi-rs\/canvas(\/|$)/.test(f)),
    pdfjsLegacy: norm.some((f) => f.includes('pdfjs-dist/legacy/build/pdf.mjs')),
  };
}

const serverRoot = path.join(process.cwd(), '.next', 'server');
if (!fs.existsSync(serverRoot)) {
  console.error('FAIL: .next/server missing — run `npm run build` first');
  process.exit(1);
}

const nfts = walk(serverRoot).filter((f) => f.endsWith('.nft.json'));
if (nfts.length < 10) {
  console.error('FAIL: expected many .nft.json files, found', nfts.length);
  process.exit(1);
}

const requiredRoutes = [
  'api/resume/upload',
  'api/job-description/extract',
  'tools/ats-checker',
];
const unrelatedRoutes = ['api/health', 'api/payments/verify', 'api/contact'];

const failures = [];

for (const key of requiredRoutes) {
  const nft = nfts.find((f) => f.replace(/\\/g, '/').includes(key));
  if (!nft) {
    failures.push(`missing NFT for required route ${key}`);
    continue;
  }
  const files = JSON.parse(fs.readFileSync(nft, 'utf8')).files || [];
  const hits = hasPdfHeavyAssets(files);
  if (!hits.standardFonts || !hits.cmaps || !hits.pdfjsLegacy) {
    failures.push(
      `${key} missing required pdfjs assets: ${JSON.stringify(hits)} (${path.relative(process.cwd(), nft)})`,
    );
  }
}

for (const key of unrelatedRoutes) {
  const nft = nfts.find((f) => f.replace(/\\/g, '/').includes(key));
  if (!nft) {
    failures.push(`missing NFT for unrelated route ${key}`);
    continue;
  }
  const files = JSON.parse(fs.readFileSync(nft, 'utf8')).files || [];
  const hits = hasPdfHeavyAssets(files);
  if (hits.standardFonts || hits.cmaps || hits.pdfParse || hits.canvasPkg) {
    failures.push(
      `${key} unexpectedly contains PDF heavy assets: ${JSON.stringify(hits)} (${path.relative(process.cwd(), nft)})`,
    );
  }
}

let unrelatedWithPdf = 0;
for (const nft of nfts) {
  if (isPdfRoute(nft)) continue;
  const files = JSON.parse(fs.readFileSync(nft, 'utf8')).files || [];
  const hits = hasPdfHeavyAssets(files);
  if (hits.standardFonts || hits.cmaps || hits.pdfParse) {
    unrelatedWithPdf += 1;
  }
}

if (unrelatedWithPdf > 0) {
  failures.push(
    `${unrelatedWithPdf} unrelated NFT routes still contain pdfjs fonts/cmaps or pdf-parse (global tracing regression)`,
  );
}

if (failures.length) {
  console.error('FAIL: NFT PDF scoping verification\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('PASS: NFT PDF scoping');
console.log(`  NFT files checked: ${nfts.length}`);
console.log(`  Required PDF routes retain fonts/cmaps/pdf.mjs`);
console.log(`  Unrelated routes (${unrelatedRoutes.join(', ')}) clean of PDF heavy assets`);
console.log(`  Unrelated routes with PDF assets: 0`);
