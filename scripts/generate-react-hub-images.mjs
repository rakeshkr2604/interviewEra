/**
 * Copies committed premium React hub images to WebP (source of truth: public/blog/*-premium-2026.png).
 * Run: node scripts/generate-react-hub-images.mjs
 *
 * Do NOT use canvas fallback — edit the PNG sources in public/blog/ instead.
 */
import sharp from 'sharp'
import { existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLOG = join(__dirname, '..', 'public', 'blog')

const PAIRS = [
  {
    png: 'react-learning-roadmap-premium-2026.png',
    webp: 'react-learning-roadmap-premium-2026.webp',
  },
  {
    png: 'react-architecture-premium-2026.png',
    webp: 'react-architecture-premium-2026.webp',
  },
]

for (const { png, webp } of PAIRS) {
  const src = join(BLOG, png)
  const dest = join(BLOG, webp)
  if (!existsSync(src)) {
    console.error(`Missing source PNG: ${src}`)
    process.exit(1)
  }
  const buf = await sharp(src).webp({ quality: 93, effort: 6 }).toBuffer()
  writeFileSync(dest, buf)
  const meta = await sharp(buf).metadata()
  console.log(`Wrote ${dest} (${meta.width}×${meta.height}, ${Math.round(buf.length / 1024)} KB)`)
}
