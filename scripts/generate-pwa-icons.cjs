/**
 * Legacy helper — PWA icons now live under `public/favicon/` from brand assets.
 * Do not run for production deploys unless you intentionally replace those files.
 */
const sharp = require('sharp');
const path = require('path');

function svgForSize(size) {
  const fontSize = Math.round(size * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white"
    font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}">IE</text>
</svg>`;
}

async function main() {
  const root = path.join(__dirname, '..');
  for (const s of [192, 512]) {
    const out = path.join(root, 'public', `icon-${s}.png`);
    await sharp(Buffer.from(svgForSize(s))).png().toFile(out);
    console.log('wrote', out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
