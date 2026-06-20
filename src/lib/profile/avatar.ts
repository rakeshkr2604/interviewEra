/**
 * Profile photo constants + path helpers.
 * Safe to import from client and server (no server-only deps).
 */

export const AVATAR_BUCKET = 'profile-photos';

/** Hard cap mirrored in bucket config (038_user_profile_photos.sql). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

export const AVATAR_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

export function isAllowedAvatarMime(type: string): type is AvatarMime {
  return (AVATAR_ALLOWED_MIME as readonly string[]).includes(type.split(';')[0].trim().toLowerCase());
}

function extForMime(mime: string): 'png' | 'jpg' | 'webp' {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  return 'jpg';
}

/** Storage path — built server-side from verified session user id only. */
export function avatarObjectPath(userId: string, mime: string): string {
  return `${userId}/avatar-${Date.now()}.${extForMime(mime)}`;
}

/** True when path lives under the user's own folder. */
export function isOwnedAvatarPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes('..');
}
