/**
 * Shared screenshot constants + helpers for the feedback flow.
 * Safe to import from both client and server (no server-only deps).
 */

export const SCREENSHOT_BUCKET = 'feedback-screenshots';

/** Hard cap mirrored in the bucket config (028_feedback_screenshots.sql). */
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

/** Above this we re-encode client-side to shrink the payload before upload. */
export const SCREENSHOT_COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2 MiB

export const SCREENSHOT_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ScreenshotMime = (typeof SCREENSHOT_ALLOWED_MIME)[number];

export function isAllowedScreenshotMime(type: string): type is ScreenshotMime {
  return (SCREENSHOT_ALLOWED_MIME as readonly string[]).includes(type.split(';')[0].trim().toLowerCase());
}

/** Canonical file extension for a (validated) image MIME type. */
export function extForMime(mime: string): 'png' | 'jpg' | 'webp' {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  return 'jpg'; // image/jpeg
}

/**
 * Storage object path for a user's screenshot. The userId segment is the
 * trust boundary — the API route builds this server-side from the session,
 * never from client input.
 */
export function screenshotPath(userId: string, mime: string, stem: string): string {
  return `feedback/${userId}/${Date.now()}-${stem}.${extForMime(mime)}`;
}

/** True if a path is owned by `userId` (feedback/{userId}/...). */
export function isOwnedScreenshotPath(path: string, userId: string): boolean {
  return path.startsWith(`feedback/${userId}/`) && !path.includes('..');
}

/**
 * Sanitize a user-supplied filename into a safe path stem (no extension,
 * lowercase, ascii). Falls back to "screenshot" when nothing usable remains.
 */
export function sanitizeStem(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const raw = dot > 0 ? base.slice(0, dot) : base;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
  return cleaned || 'screenshot';
}
