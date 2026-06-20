import type { SupabaseClient } from '@supabase/supabase-js';
import { AVATAR_ALLOWED_MIME, AVATAR_BUCKET, AVATAR_MAX_BYTES } from '@/lib/profile/avatar';

let bucketReady = false;

/** Idempotent — creates the public profile-photos bucket when migration 038 was not applied yet. */
export async function ensureProfilePhotosBucket(
  service: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (bucketReady) return { ok: true };

  const { data: buckets, error: listErr } = await service.storage.listBuckets();
  if (listErr) {
    return { ok: false, message: listErr.message };
  }

  const exists = buckets?.some((bucket) => bucket.id === AVATAR_BUCKET || bucket.name === AVATAR_BUCKET);
  if (!exists) {
    const { error: createErr } = await service.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: AVATAR_MAX_BYTES,
      allowedMimeTypes: [...AVATAR_ALLOWED_MIME],
    });
    if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
      return { ok: false, message: createErr.message };
    }
  }

  bucketReady = true;
  return { ok: true };
}

export function isAvatarPathColumnMissing(message: string): boolean {
  return /avatar_path/i.test(message) && /(column|schema cache|does not exist)/i.test(message);
}

export function avatarStorageSetupMessage(): string {
  return 'Profile photo storage is not set up yet. Run supabase/migrations/038_user_profile_photos.sql in the Supabase SQL Editor, then try again.';
}
