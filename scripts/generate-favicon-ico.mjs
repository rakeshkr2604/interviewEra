/**
 * Builds `public/favicon.ico` from clean Logo Package v1 favicon PNGs (16 + 32px).
 * Prefer `npm run prepare:logo-package` which regenerates the full favicon set.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sources = [
  path.join(root, 'public', 'favicon', 'favicon-16x16.png'),
  path.join(root, 'public', 'favicon', 'favicon-32x32.png'),
]
const out = path.join(root, 'public', 'favicon.ico')
const nested = path.join(root, 'public', 'favicon', 'favicon.ico')

for (const p of sources) {
  if (!fs.existsSync(p)) throw new Error(`Missing source PNG: ${p}`)
}

const buf = await pngToIco(sources)
fs.writeFileSync(out, buf)
fs.writeFileSync(nested, buf)
console.log('wrote', out, `(${buf.length} bytes)`)
console.log('wrote', nested, `(${buf.length} bytes)`)
