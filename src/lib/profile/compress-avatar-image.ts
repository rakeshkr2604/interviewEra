'use client';

import { AVATAR_MAX_BYTES } from '@/lib/profile/avatar';

const MAX_DIMENSION = 512;
const COMPRESS_THRESHOLD = 256 * 1024; // 256 KiB

/** Square-friendly resize for profile photos before upload. */
export async function compressAvatarImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file;
  if (typeof document === 'undefined') return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/webp', 0.86);
    if (!blob) return file;

    const next = new File([blob], 'avatar.webp', { type: 'image/webp', lastModified: Date.now() });
    if (next.size > AVATAR_MAX_BYTES && next.size >= file.size) return file;
    return next.size <= AVATAR_MAX_BYTES ? next : file;
  } catch {
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
