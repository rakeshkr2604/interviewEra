import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const outDir = join(process.cwd(), 'validation-results', 'lighthouse');
mkdirSync(outDir, { recursive: true });

const profiles = [
  {
    name: 'desktop',
    args: [
      '--preset=desktop',
      '--screenEmulation.disabled',
      '--throttling.cpuSlowdownMultiplier=1',
    ],
  },
  {
    name: 'mobile',
    args: [
      '--form-factor=mobile',
      '--screenEmulation.mobile',
    ],
  },
];

function runLighthouse(profile) {
  const outPath = join(outDir, `${profile.name}.json`);
  const chromeDir = join(outDir, `chrome-${profile.name}`);
  mkdirSync(chromeDir, { recursive: true });

  const args = [
    'lighthouse',
    `${baseUrl}/`,
    '--output=json',
    `--output-path=${outPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    `--chrome-flags=--headless=new --no-sandbox --disable-gpu --user-data-dir=${chromeDir}`,
    '--quiet',
    ...profile.args,
  ];

  const result = spawnSync('npx', args, { encoding: 'utf8', shell: true });
  if (!existsSync(outPath)) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  const report = JSON.parse(readFileSync(outPath, 'utf8'));
  const categories = Object.fromEntries(
    Object.entries(report.categories ?? {}).map(([key, value]) => [
      key,
      Math.round((value.score ?? 0) * 100),
    ]),
  );

  const metrics = {
    fcp: report.audits['first-contentful-paint']?.numericValue,
    lcp: report.audits['largest-contentful-paint']?.numericValue,
    cls: report.audits['cumulative-layout-shift']?.numericValue,
    tbt: report.audits['total-blocking-time']?.numericValue,
    si: report.audits['speed-index']?.numericValue,
    inp: report.audits['experimental-interaction-to-next-paint']?.numericValue
      ?? report.audits['interaction-to-next-paint']?.numericValue,
  };

  return { profile: profile.name, categories, metrics, warnings: report.runWarnings ?? [] };
}

const summary = profiles.map(runLighthouse);
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
