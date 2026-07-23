/**
 * One-time build helper: extract video/mp4 blobs from Claude Design HTML bundles
 * into raw files for ffmpeg re-encoding. Does NOT ship base64 in the app.
 *
 * Usage: node scripts/extract-claude-design-video.mjs <path-to.html> <output.mp4>
 */
import fs from 'fs';

const [htmlPath, outPath] = process.argv.slice(2);
if (!htmlPath || !outPath) {
  console.error('Usage: node scripts/extract-claude-design-video.mjs <html> <out.mp4>');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!m) {
  console.error('No __bundler/manifest found in', htmlPath);
  process.exit(1);
}

const manifest = JSON.parse(m[1]);
const videos = Object.entries(manifest).filter(([, v]) => v.mime === 'video/mp4');
if (videos.length === 0) {
  console.error('No video/mp4 entries in manifest. Entries:', Object.values(manifest).map((v) => v.mime));
  process.exit(1);
}

const [uuid, entry] = videos.sort((a, b) => (b[1].data?.length ?? 0) - (a[1].data?.length ?? 0))[0];
const raw = Buffer.from(entry.data, 'base64');
fs.mkdirSync(outPath.replace(/[/\\][^/\\]+$/, ''), { recursive: true });
fs.writeFileSync(outPath, raw);
console.log(JSON.stringify({ htmlPath, uuid, bytes: raw.length, outPath }, null, 2));
