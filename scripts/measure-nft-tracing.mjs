// Measure .next/server NFT manifests for PDF/canvas/pdf-parse tracing bloat.
// Usage: node scripts/measure-nft-tracing.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';

function dirSize(p) {
  let t = 0;
  if (!fs.existsSync(p)) return 0;
  const st = fs.statSync(p);
  if (st.isFile()) return st.size;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    try {
      t += dirSize(path.join(p, e.name));
    } catch {
      /* ignore */
    }
  }
  return t;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const markers = {
  pdfjs: /pdfjs-dist/,
  canvas: /@napi-rs[/\\]canvas/,
  pdfParse: /pdf-parse/,
  tesseract: /tesseract/,
  mammoth: /mammoth/,
  standardFonts: /pdfjs-dist[/\\]standard_fonts/,
  cmaps: /pdfjs-dist[/\\]cmaps/,
  legacyBuild: /pdfjs-dist[/\\]legacy[/\\]build/,
};

function analyzeNft(f) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const files = j.files || [];
  const hits = {};
  for (const k of Object.keys(markers)) {
    hits[k] = files.filter((x) => markers[k].test(x)).length;
  }
  let tracedBytes = 0;
  for (const rel of files) {
    const candidates = [
      path.resolve(path.dirname(f), rel),
      path.resolve(rel),
      path.join(process.cwd(), rel),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        tracedBytes += fs.statSync(c).size;
        break;
      }
    }
  }
  return { file: f, count: files.length, tracedMB: tracedBytes / 1024 / 1024, hits };
}

function isPdfRoute(filePath) {
  const rel = filePath.replace(/\\/g, '/');
  return (
    /resume\/upload/.test(rel) ||
    /job-description\/extract/.test(rel) ||
    /ats-checker/.test(rel) ||
    /report\/(script\/)?export-pdf/.test(rel)
  );
}

const root = '.next';
const serverSize = dirSize(path.join(root, 'server'));
const totalNext = dirSize(root);
const nfts = walk(path.join(root, 'server')).filter((f) => f.endsWith('.nft.json'));
const analyses = nfts.map(analyzeNft).sort((a, b) => b.tracedMB - a.tracedMB);

const withPdf = analyses.filter(
  (a) => a.hits.pdfjs > 0 || a.hits.standardFonts > 0 || a.hits.cmaps > 0,
);
const withCanvas = analyses.filter((a) => a.hits.canvas > 0);
const withParse = analyses.filter((a) => a.hits.pdfParse > 0);

const targets = [
  'api/resume/upload',
  'api/job-description/extract',
  'api/health',
  'api/payments/verify',
  'tools/ats-checker',
  'api/interview/script/turn',
  'api/account/profile',
  'api/contact',
];

const targetResults = {};
for (const t of targets) {
  const a = analyses.find((x) => x.file.replace(/\\/g, '/').includes(t));
  targetResults[t] = a
    ? { tracedMB: a.tracedMB, count: a.count, hits: a.hits, file: path.relative(process.cwd(), a.file) }
    : null;
}

let unrelatedWithPdf = 0;
let unrelatedTracedSumMB = 0;
for (const a of analyses) {
  if (!isPdfRoute(a.file) && a.hits.pdfjs > 0) {
    unrelatedWithPdf += 1;
    unrelatedTracedSumMB += a.tracedMB;
  }
}

const report = {
  totalNextMB: totalNext / 1024 / 1024,
  serverMB: serverSize / 1024 / 1024,
  nftCount: nfts.length,
  withPdf: withPdf.length,
  withCanvas: withCanvas.length,
  withParse: withParse.length,
  unrelatedWithPdf,
  unrelatedTracedSumMB,
  top: analyses.slice(0, 25).map((a) => ({
    file: path.relative(process.cwd(), a.file),
    tracedMB: a.tracedMB,
    count: a.count,
    hits: a.hits,
  })),
  targets: targetResults,
};

const out = process.argv[2] || 'validation-results/nft-baseline.json';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));

console.log('TOTAL .next:', report.totalNextMB.toFixed(2), 'MB');
console.log('TOTAL .next/server:', report.serverMB.toFixed(2), 'MB');
console.log('NFT files:', report.nftCount);
console.log('Routes with pdfjs:', report.withPdf);
console.log('Routes with canvas:', report.withCanvas);
console.log('Routes with pdf-parse:', report.withParse);
console.log('Unrelated routes with pdfjs:', report.unrelatedWithPdf);
console.log('\nTop 12 largest NFT:');
for (const a of report.top.slice(0, 12)) {
  console.log(
    a.tracedMB.toFixed(2) + 'MB',
    a.count + 'files',
    'pdfjs:' + a.hits.pdfjs,
    'canvas:' + a.hits.canvas,
    'pdfparse:' + a.hits.pdfParse,
    a.file,
  );
}
console.log('\nTarget routes:');
for (const [t, a] of Object.entries(report.targets)) {
  if (!a) {
    console.log('MISSING', t);
    continue;
  }
  console.log(
    t,
    'MB=' + a.tracedMB.toFixed(2),
    'files=' + a.count,
    'pdfjs=' + a.hits.pdfjs,
    'canvas=' + a.hits.canvas,
    'pdfparse=' + a.hits.pdfParse,
  );
}
console.log('\nWrote', out);
