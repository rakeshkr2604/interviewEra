/**
 * Prepares InterviewEra Logo Package v1 for production serving.
 *
 * - Copies approved package files into public/brand/{primary,icons,social,monochrome}
 * - Installs favicon/PWA bitmaps under public/favicon/ (+ root favicon.ico)
 * - Derives UI chrome icons by cropping board labels / punching near-white
 *   backgrounds to transparent (mark artwork unchanged)
 *
 * Source of truth: InterviewEra_Logo_Package_v1/InterviewEra_Logo_Package_v1/
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pkg = path.join(root, 'InterviewEra_Logo_Package_v1', 'InterviewEra_Logo_Package_v1')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFile(from, to) {
  ensureDir(path.dirname(to))
  fs.copyFileSync(from, to)
  console.log('copy', path.relative(root, to))
}

/** @param {string | Buffer} input */
async function punchNearWhiteToAlpha(input, outputPath, { threshold = 248 } = {}) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0
    }
  }

  ensureDir(path.dirname(outputPath))
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outputPath)
}

/**
 * Crop board-chrome square icon: drop bottom label strip, punch white plate,
 * trim, then emit square PNG + WebP for UI chrome.
 */
/**
 * Crop board caption pills from primary lockups; keep white plate (white-first).
 * Cuts chosen from dark-pixel row scans (label sits below logo tagline).
 */
async function preparePrimaryUiLockups() {
  const crops = [
    {
      file: 'interviewera-horizontal.png',
      outBase: 'interviewera-horizontal',
      // Tagline ends ~y532; label starts ~y596 on 720 canvas
      heightRatio: 580 / 720,
    },
    {
      file: 'interviewera-primary-vertical.png',
      outBase: 'interviewera-primary-vertical',
      // Tagline/body through ~y1024; label ~y1100+ on 1250 canvas
      heightRatio: 1060 / 1250,
    },
    {
      file: 'interviewera-stacked.png',
      outBase: 'interviewera-stacked',
      heightRatio: 800 / 1100,
    },
  ]

  for (const { file, outBase, heightRatio, pad } of crops) {
    const source = path.join(pkg, '01-primary', file)
    const meta = await sharp(source).metadata()
    const w = meta.width ?? 1
    const h = meta.height ?? 1
    const cropH = Math.min(h, Math.round(h * heightRatio))
    const outDir = path.join(root, 'public', 'brand', 'primary', 'ui')
    ensureDir(outDir)
    const outPng = path.join(outDir, `${outBase}.png`)
    const outWebp = path.join(outDir, `${outBase}.webp`)
    // PNG master at full crop resolution — navbar uses PNG for sharper type edges
    let pipeline = sharp(source).extract({ left: 0, top: 0, width: w, height: cropH })
    if (pad) {
      pipeline = pipeline.extend({
        left: pad.left ?? 0,
        right: pad.right ?? 0,
        top: pad.top ?? 0,
        bottom: pad.bottom ?? 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
    }
    await pipeline.png({ compressionLevel: 6, quality: 100 }).toFile(outPng)
    await sharp(outPng).webp({ quality: 95 }).toFile(outWebp)
    console.log('wrote', path.relative(root, outPng), '(primary UI crop)')
    console.log('wrote', path.relative(root, outWebp), '(primary UI crop)')
  }
}

/**
 * Keep purple squircle + white IE letters; drop board plate, caption, and soft
 * circular drop-shadow so the mark fills chrome tiles without a halo.
 */
async function extractAppIconMark(inputBuf, outputPath) {
  const { data, info } = await sharp(inputBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const purple = new Uint8Array(w * h)

  const isPurple = (r, g, b, a) => {
    if (a < 20) return false
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const chroma = max - min
    return chroma > 45 && b > 100 && b >= g - 10
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (isPurple(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        purple[y * w + x] = 1
      }
    }
  }

  // Dilate purple mask so white IE lettering / antialias inside the tile is kept.
  const dilate = 14
  const keep = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!purple[y * w + x]) continue
      for (let dy = -dilate; dy <= dilate; dy++) {
        for (let dx = -dilate; dx <= dilate; dx++) {
          if (dx * dx + dy * dy > dilate * dilate) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          keep[ny * w + nx] = 1
        }
      }
    }
  }

  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (!keep[p]) {
      data[i + 3] = 0
      continue
    }
    // Near-white→alpha punch clears white IE letter fills (RGB stays). Restore
    // opaque white inside the tile so dark chrome does not show through holes.
    if (data[i + 3] < 32) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r >= 200 && g >= 200 && b >= 200) {
        data[i + 3] = 255
      }
    }
  }

  // Close tiny interior holes (antialias gaps inside IE strokes).
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] >= 16) continue
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) continue
      let opaque = 0
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ]) {
        if (data[((y + dy) * w + (x + dx)) * 4 + 3] >= 200) opaque++
      }
      if (opaque >= 5) data[i + 3] = 255
    }
  }

  // Strip only the outer light rim (package glow). Build a tight purple core mask
  // and drop light pixels that sit outside a small dilate of that core.
  const coreDilate = 3
  const nearPurple = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!purple[y * w + x]) continue
      for (let dy = -coreDilate; dy <= coreDilate; dy++) {
        for (let dx = -coreDilate; dx <= coreDilate; dx++) {
          if (dx * dx + dy * dy > coreDilate * coreDilate) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          nearPurple[ny * w + nx] = 1
        }
      }
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (data[i + 3] < 8 || nearPurple[p]) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r >= 190 && g >= 190 && b >= 190) data[i + 3] = 0
  }

  ensureDir(path.dirname(outputPath))
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(outputPath)
}

/**
 * Navbar pieces (composed in React — one wide raster crushes the IE at ~36px height):
 * - monogram from primary vertical board (full IE bbox; prior left:400 clipped ~175px of I)
 * - wordmark-only from horizontal (InterviewEra)
 * Tagline stays CSS.
 */
async function prepareNavbarLockup() {
  const vertical = path.join(pkg, '01-primary', 'interviewera-primary-vertical.png')
  const horizontal = path.join(pkg, '01-primary', 'interviewera-horizontal.png')
  const outDir = path.join(root, 'public', 'brand', 'primary', 'ui')
  ensureDir(outDir)

  async function flattenNearWhite(buf) {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r >= 245 && g >= 245 && b >= 245) {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }
    return sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer()
  }

  // Monogram-only on vertical board ≈ y120–780, x~500–1380 (wordmark starts ~y860).
  // Taller extracts pulled “InterviewEra” into the square and looked like a clipped IE.
  const markBuf = await flattenNearWhite(
    await sharp(vertical)
      .extract({ left: 420, top: 40, width: 1040, height: 780 })
      .png()
      .toBuffer(),
  )
  const markPunchedPath = path.join(outDir, '_tmp-monogram-punched.png')
  await punchNearWhiteToAlpha(markBuf, markPunchedPath, { threshold: 248 })

  // Content box + % pad (not sharp.trim — soft serifs/shadows).
  const { data: rawMark, info: markInfo } = await sharp(markPunchedPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let minX = markInfo.width
  let minY = markInfo.height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < markInfo.height; y++) {
    for (let x = 0; x < markInfo.width; x++) {
      const i = (y * markInfo.width + x) * 4
      if (rawMark[i + 3] > 16) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  const contentW = Math.max(1, maxX - minX + 1)
  const contentH = Math.max(1, maxY - minY + 1)
  const pad = Math.round(Math.max(contentW, contentH) * 0.16)
  const extractLeft = Math.max(0, minX - pad)
  const extractTop = Math.max(0, minY - pad)
  const extractW = Math.min(markInfo.width - extractLeft, contentW + pad * 2)
  const extractH = Math.min(markInfo.height - extractTop, contentH + pad * 2)

  const markPng = path.join(outDir, 'interviewera-monogram-nav.png')
  const markWebp = path.join(outDir, 'interviewera-monogram-nav.webp')
  const markFittedPath = path.join(outDir, '_tmp-monogram-fitted.png')
  await sharp(markPunchedPath)
    .extract({
      left: extractLeft,
      top: extractTop,
      width: extractW,
      height: extractH,
    })
    .resize(520, 520, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(markFittedPath)
  // Guaranteed transparent ring so navbar never clips serifs / glow at the tile edge.
  await sharp({
    create: {
      width: 640,
      height: 640,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: await sharp(markFittedPath).png().toBuffer(), left: 60, top: 60 }])
    .png()
    .toFile(markPng)
  await sharp(markPng).webp({ quality: 95 }).toFile(markWebp)
  fs.unlinkSync(markPunchedPath)
  fs.unlinkSync(markFittedPath)
  console.log('monogram content box', {
    minX,
    minY,
    maxX,
    maxY,
    pad,
    extractW,
    extractH,
  })

  // Wordmark only — gap before Interview ~735–830. Avoid trim (soft glyph edges).
  const wordBuf = await flattenNearWhite(
    await sharp(horizontal)
      .extract({ left: 820, top: 90, width: 1360, height: 300 })
      .png()
      .toBuffer(),
  )

  const wordPng = path.join(outDir, 'interviewera-wordmark-nav.png')
  const wordWebp = path.join(outDir, 'interviewera-wordmark-nav.webp')
  const wordResizedPath = path.join(outDir, '_tmp-wordmark-resized.png')
  await sharp(wordBuf)
    .resize({
      width: 720,
      height: 180,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(wordResizedPath)
  await punchNearWhiteToAlpha(wordResizedPath, wordPng, { threshold: 248 })
  await sharp(wordPng).webp({ quality: 95 }).toFile(wordWebp)
  fs.unlinkSync(wordResizedPath)

  console.log('wrote', path.relative(root, markPng), '(navbar monogram)')
  console.log('wrote', path.relative(root, wordPng), '(navbar wordmark)')
}

async function prepareUiIcon(sourceRelative, outBaseName) {
  const source = path.join(pkg, sourceRelative)
  const meta = await sharp(source).metadata()
  const w = meta.width ?? 1024
  const h = meta.height ?? 1024

  // Label text sits ~y≥869 on the 1024 board extract.
  const labelCutY = Math.min(h, Math.round(h * 0.848))
  const croppedBuf = await sharp(source)
    .extract({ left: 0, top: 0, width: w, height: labelCutY })
    .png()
    .toBuffer()

  const markPath = path.join(
    root,
    'public',
    'brand',
    'icons',
    'ui',
    `_tmp-${outBaseName}-mark.png`,
  )
  // Do not punch near-white before extract — that zeros white IE letter fills and
  // leaves transparent holes on dark chrome. extractAppIconMark drops the plate.
  await extractAppIconMark(croppedBuf, markPath)

  const trimmed = await sharp(markPath).trim({ threshold: 8 }).png().toBuffer()
  const trimmedMeta = await sharp(trimmed).metadata()
  const side = Math.max(trimmedMeta.width ?? 512, trimmedMeta.height ?? 512)

  const outPng = path.join(root, 'public', 'brand', 'icons', 'ui', `${outBaseName}.png`)
  const outWebp = path.join(root, 'public', 'brand', 'icons', 'ui', `${outBaseName}.webp`)

  // Minimal transparent pad so squircle corners aren't clipped by CSS radius.
  const pad = Math.round(side * 0.02)
  await sharp(trimmed)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize({
      width: side,
      height: side,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPng)

  await sharp(outPng).webp({ quality: 92 }).toFile(outWebp)
  fs.unlinkSync(markPath)
  console.log('wrote', path.relative(root, outPng))
  console.log('wrote', path.relative(root, outWebp))
}

/**
 * Package 03-favicon bitmaps are board extracts (white plate + label chrome).
 * Archive those unmodified under public/brand/favicon-source/, then emit clean
 * browser/PWA sizes from the prepared UI square mark (artwork unchanged).
 */
async function installFavicons(uiSquarePng) {
  const favSrc = path.join(pkg, '03-favicon')
  const archiveDest = path.join(root, 'public', 'brand', 'favicon-source')
  const favDest = path.join(root, 'public', 'favicon')
  ensureDir(archiveDest)
  ensureDir(favDest)

  for (const entry of fs.readdirSync(favSrc)) {
    const from = path.join(favSrc, entry)
    if (!fs.statSync(from).isFile()) continue
    copyFile(from, path.join(archiveDest, entry))
  }

  /** Resize UI square; optional opaque plate (Apple/PWA dislike large transparent margins). */
  async function writeSizedIcon(outPath, size, { opaqueWhite = false } = {}) {
    const resized = await sharp(uiSquarePng)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()

    if (opaqueWhite) {
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([{ input: resized }])
        .png()
        .toFile(outPath)
    } else {
      await sharp(resized).toFile(outPath)
    }
    console.log('wrote', path.relative(root, outPath), '(from UI square)')
  }

  const faviconSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512]
  for (const size of faviconSizes) {
    await writeSizedIcon(path.join(favDest, `favicon-${size}x${size}.png`), size)
  }

  // Apple touch: opaque white plate (iOS historically fills alpha with black)
  await writeSizedIcon(path.join(favDest, 'apple-touch-icon.png'), 180, { opaqueWhite: true })

  const androidSizes = [72, 96, 128, 144, 152, 192, 384, 512]
  for (const size of androidSizes) {
    await writeSizedIcon(path.join(favDest, `android-chrome-${size}x${size}.png`), size, {
      opaqueWhite: true,
    })
  }

  // Prefer package multi-size ICO when present; also keep root + /favicon/ copies.
  const pkgIco = path.join(favSrc, 'favicon.ico')
  if (fs.existsSync(pkgIco)) {
    copyFile(pkgIco, path.join(favDest, 'favicon.ico'))
    copyFile(pkgIco, path.join(root, 'public', 'favicon.ico'))
  }
}

function copyBrandTree() {
  const groups = [
    ['01-primary', 'primary'],
    ['02-icons', 'icons'],
    ['04-social', 'social'],
    ['05-monochrome', 'monochrome'],
  ]

  for (const [fromDir, toDir] of groups) {
    const srcDir = path.join(pkg, fromDir)
    const destDir = path.join(root, 'public', 'brand', toDir)
    ensureDir(destDir)
    for (const entry of fs.readdirSync(srcDir)) {
      const from = path.join(srcDir, entry)
      if (!fs.statSync(from).isFile()) continue
      copyFile(from, path.join(destDir, entry))
    }
  }

  copyFile(path.join(pkg, 'BRAND_COLORS.txt'), path.join(root, 'public', 'brand', 'BRAND_COLORS.txt'))
}

/**
 * Transparent purple IE monogram for dark chrome (no purple squircle plate).
 * Source: 05-monochrome/interviewera-purple-icon — crop board label, punch plate.
 */
async function preparePurpleMark() {
  const source = path.join(pkg, '05-monochrome', 'interviewera-purple-icon.png')
  const meta = await sharp(source).metadata()
  const w = meta.width ?? 1000
  const h = meta.height ?? 1000
  const cropH = Math.min(h, Math.round(h * 0.82))
  const { data, info } = await sharp(source)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r >= 230 && g >= 230 && b >= 230) data[i + 3] = 0
  }

  // Despill white/pink plate antialias (reads as a halo on dark chrome).
  const { width: pw, height: ph } = info
  for (let pass = 0; pass < 5; pass++) {
    let removed = 0
    const next = Buffer.from(data)
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4
        if (data[i + 3] < 8) continue
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const chroma = max - min
        const isPurple = chroma > 35 && b > 90 && b >= g - 15
        if (isPurple) continue
        const lum = (r + g + b) / 3
        // Near-white or low-chroma bright fringe from the white board plate.
        if (lum < 150 && chroma > 25) continue
        let clear = false
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= pw || ny >= ph || data[(ny * pw + nx) * 4 + 3] < 20) {
            clear = true
            break
          }
        }
        if (clear) {
          next[i + 3] = 0
          removed++
        }
      }
    }
    next.copy(data)
    if (removed === 0) break
  }

  const punched = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
  const trimmed = await sharp(punched).trim({ threshold: 12 }).png().toBuffer()
  const tmeta = await sharp(trimmed).metadata()
  const side = Math.max(tmeta.width ?? 512, tmeta.height ?? 512)
  const pad = 20
  const outDir = path.join(root, 'public', 'brand', 'monochrome', 'ui')
  ensureDir(outDir)
  const outPng = path.join(outDir, 'interviewera-purple-mark.png')
  const outWebp = path.join(outDir, 'interviewera-purple-mark.webp')
  const fitted = await sharp(trimmed)
    .resize(side, side, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: side + pad * 2,
      height: side + pad * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, left: pad, top: pad }])
    .png()
    .toFile(outPng)
  await sharp(outPng).webp({ quality: 95 }).toFile(outWebp)
  console.log('wrote', path.relative(root, outPng), '(purple mark)')
  console.log('wrote', path.relative(root, outWebp), '(purple mark)')
}

async function main() {
  if (!fs.existsSync(pkg)) {
    throw new Error(`Logo package not found: ${pkg}`)
  }

  copyBrandTree()
  await preparePrimaryUiLockups()
  await prepareNavbarLockup()
  await prepareUiIcon(
    path.join('02-icons', 'interviewera-icon-square-white.png'),
    'interviewera-icon-square',
  )
  await prepareUiIcon(
    path.join('02-icons', 'interviewera-icon-circle-white.png'),
    'interviewera-icon-circle',
  )
  await preparePurpleMark()
  const uiSquarePng = path.join(
    root,
    'public',
    'brand',
    'icons',
    'ui',
    'interviewera-icon-square.png',
  )
  await installFavicons(uiSquarePng)

  // Rebuild multi-resolution favicon.ico from clean 16 + 32 PNGs when png-to-ico is available.
  try {
    const pngToIco = (await import('png-to-ico')).default
    const icoBuf = await pngToIco([
      path.join(root, 'public', 'favicon', 'favicon-16x16.png'),
      path.join(root, 'public', 'favicon', 'favicon-32x32.png'),
    ])
    const rootIco = path.join(root, 'public', 'favicon.ico')
    const nestedIco = path.join(root, 'public', 'favicon', 'favicon.ico')
    fs.writeFileSync(rootIco, icoBuf)
    fs.writeFileSync(nestedIco, icoBuf)
    console.log('wrote', path.relative(root, rootIco), `(${icoBuf.length} bytes, clean)`)
  } catch (err) {
    console.warn('png-to-ico rebuild skipped:', err?.message ?? err)
  }

  console.log('Logo package v1 prepare complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
