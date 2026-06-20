import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  isAllowedAvatarMime,
  isOwnedAvatarPath,
} from '@/lib/profile/avatar';
import {
  avatarStorageSetupMessage,
  ensureProfilePhotosBucket,
  isAvatarPathColumnMissing,
} from '@/lib/profile/ensure-avatar-storage';

export const runtime = 'nodejs';

const confirmSchema = z.object({
  path: z.string().min(1).max(512),
});

async function deleteAvatarObject(service: ReturnType<typeof createServiceClient>, path: string | null) {
  if (!path) return;
  const { error } = await service.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) {
    console.warn('[account/avatar] remove old object:', error.message);
  }
}

async function persistAvatarPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  path: string,
  previousPath: string | null,
  userMetadata: Record<string, unknown>,
) {
  const service = createServiceClient();

  const { error: dbErr } = await supabase.from('users').update({ avatar_path: path }).eq('id', userId);

  if (dbErr) {
    console.error('[account/avatar] users.update:', dbErr.message);
    if (isAvatarPathColumnMissing(dbErr.message)) {
      await deleteAvatarObject(service, path);
      return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
    }
    await deleteAvatarObject(service, path);
    return NextResponse.json({ error: 'Failed to save profile photo.' }, { status: 500 });
  }

  if (previousPath && previousPath !== path) {
    await deleteAvatarObject(service, previousPath);
  }

  await supabase.auth.updateUser({
    data: { ...userMetadata, avatar_path: path },
  });

  return NextResponse.json({ ok: true, avatarPath: path });
}

/** Upload profile photo (multipart) — service-role storage upload, single step. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(`avatar-upload:${user.id}`, 3600, 12);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many photo uploads. Please wait and try again.' },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get('file');
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: 'No photo provided.' }, { status: 400 });
    }

    if (!isAllowedAvatarMime(fileValue.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PNG, JPG, or WEBP.' },
        { status: 400 },
      );
    }

    if (fileValue.size <= 0 || fileValue.size > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: 'Photo must be 2 MB or smaller.' }, { status: 400 });
    }

    const service = createServiceClient();
    const bucketReady = await ensureProfilePhotosBucket(service);
    if (!bucketReady.ok) {
      console.error('[account/avatar] ensure bucket failed:', bucketReady.message);
      return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
    }

    const path = avatarObjectPath(user.id, fileValue.type);
    const bytes = Buffer.from(await fileValue.arrayBuffer());

    const { error: uploadErr } = await service.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: fileValue.type,
      upsert: true,
    });

    if (uploadErr) {
      console.error('[account/avatar] upload failed:', uploadErr.message);
      return NextResponse.json(
        { error: 'Upload failed. Please try again in a moment.' },
        { status: 502 },
      );
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('avatar_path')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[account/avatar] users.select:', fetchErr.message);
      await deleteAvatarObject(service, path);
      if (isAvatarPathColumnMissing(fetchErr.message)) {
        return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to save profile photo.' }, { status: 500 });
    }

    const previousPath =
      existing && typeof existing.avatar_path === 'string' ? existing.avatar_path : null;

    return persistAvatarPath(
      supabase,
      user.id,
      path,
      previousPath,
      (user.user_metadata ?? {}) as Record<string, unknown>,
    );
  } catch (err) {
    console.error('[account/avatar] POST unexpected:', err);
    const message = err instanceof Error ? err.message : 'Upload failed.';
    if (/SUPABASE_SERVICE_ROLE_KEY|Missing NEXT_PUBLIC_SUPABASE_URL/i.test(message)) {
      return NextResponse.json(
        { error: 'Server storage is not configured. Check Supabase env keys.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

/** Legacy confirm step — kept for compatibility if a client already uploaded to storage. */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const { path } = parsed.data;
    if (!isOwnedAvatarPath(path, user.id)) {
      return NextResponse.json({ error: 'Invalid photo path.' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('avatar_path')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[account/avatar] users.select:', fetchErr.message);
      if (isAvatarPathColumnMissing(fetchErr.message)) {
        return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to update profile photo.' }, { status: 500 });
    }

    const previousPath =
      existing && typeof existing.avatar_path === 'string' ? existing.avatar_path : null;

    return persistAvatarPath(
      supabase,
      user.id,
      path,
      previousPath,
      (user.user_metadata ?? {}) as Record<string, unknown>,
    );
  } catch (err) {
    console.error('[account/avatar] PATCH unexpected:', err);
    return NextResponse.json({ error: 'Failed to update profile photo.' }, { status: 500 });
  }
}

/** Remove custom profile photo. */
export async function DELETE(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('avatar_path')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[account/avatar] users.select:', fetchErr.message);
      if (isAvatarPathColumnMissing(fetchErr.message)) {
        return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to remove profile photo.' }, { status: 500 });
    }

    const previousPath =
      existing && typeof existing.avatar_path === 'string' ? existing.avatar_path : null;

    const { error: dbErr } = await supabase.from('users').update({ avatar_path: null }).eq('id', user.id);

    if (dbErr) {
      console.error('[account/avatar] users.update:', dbErr.message);
      if (isAvatarPathColumnMissing(dbErr.message)) {
        return NextResponse.json({ error: avatarStorageSetupMessage() }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to remove profile photo.' }, { status: 500 });
    }

    if (previousPath) {
      const service = createServiceClient();
      await deleteAvatarObject(service, previousPath);
    }

    const nextMeta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
    delete nextMeta.avatar_path;
    await supabase.auth.updateUser({ data: nextMeta });

    return NextResponse.json({ ok: true, avatarPath: null });
  } catch (err) {
    console.error('[account/avatar] DELETE unexpected:', err);
    return NextResponse.json({ error: 'Failed to remove profile photo.' }, { status: 500 });
  }
}
