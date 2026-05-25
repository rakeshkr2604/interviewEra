'use client'

import { SCREENSHOT_COMPRESS_THRESHOLD } from './screenshot'

const MAX_DIMENSION = 1920 // px on the longest edge — plenty for a UI screenshot

/**
 * Re-encodes a large screenshot to a smaller JPEG client-side before upload.
 * Only runs when the file is over the threshold; otherwise returns it untouched.
 *
 * Uses HTMLImageElement + canvas.toBlob, which is supported on mobile Safari and
 * Chrome. Any failure (decode error, tainted canvas, missing toBlob) falls back
 * to the original file so the upload still proceeds.
 */
export async function maybeCompressImage(file: File): Promise<File> {
  if (file.size <= SCREENSHOT_COMPRESS_THRESHOLD) return file
  if (typeof document === 'undefined') return file
  // PNGs can carry transparency; re-encoding to JPEG flattens it. That's an
  // acceptable tradeoff for a debug screenshot, and keeps the output small.

  try {
    const dataUrl = await readAsDataUrl(file)
    const img = await loadImage(dataUrl)

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.82)
    if (!blob || blob.size >= file.size) return file // no win — keep original

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality)
  })
}
