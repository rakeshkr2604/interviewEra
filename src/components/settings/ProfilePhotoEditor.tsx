'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AVATAR_MAX_BYTES, isAllowedAvatarMime } from '@/lib/profile/avatar';
import { compressAvatarImage } from '@/lib/profile/compress-avatar-image';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'uploading' | 'removing';

export function ProfilePhotoEditor({
  name,
  email,
  initialAvatarPath,
  oauthPictureUrl,
  onAvatarPathChange,
}: {
  name: string | null;
  email: string;
  initialAvatarPath: string | null;
  oauthPictureUrl: string | null;
  onAvatarPathChange: (path: string | null) => void;
}) {
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [status, setStatus] = useState<Status>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarPath(initialAvatarPath);
  }, [initialAvatarPath]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAllowedAvatarMime(file.type)) {
        toast.error('Use a PNG, JPG, or WEBP photo.');
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        toast.error('Photo must be 2 MB or smaller.');
        return;
      }

      setStatus('uploading');
      try {
        const prepared = await compressAvatarImage(file);
        if (prepared.size > AVATAR_MAX_BYTES) {
          toast.error('Photo is still too large after compression. Try a smaller image.');
          setStatus('idle');
          return;
        }

        const formData = new FormData();
        formData.append('file', prepared, prepared.name);

        const res = await fetch('/api/account/avatar', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          avatarPath?: string;
        } | null;

        if (!res.ok) {
          throw new Error(data?.error ?? 'Upload failed. Please try again.');
        }

        const path = data?.avatarPath ?? null;
        if (!path) {
          throw new Error('Upload completed but photo was not saved.');
        }

        setAvatarPath(path);
        onAvatarPathChange(path);
        toast.success('Profile photo updated.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      } finally {
        setStatus('idle');
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onAvatarPathChange],
  );

  const removePhoto = useCallback(async () => {
    if (!avatarPath) return;
    setStatus('removing');
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Could not remove photo.');
      }
      setAvatarPath(null);
      onAvatarPathChange(null);
      toast.success('Profile photo removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      setStatus('idle');
    }
  }, [avatarPath, onAvatarPathChange]);

  const busy = status !== 'idle';
  const hasCustomPhoto = Boolean(avatarPath);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0 self-start">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'group relative rounded-full outline-none ring-2 ring-transparent transition-shadow',
            'focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]',
            busy ? 'cursor-wait opacity-80' : 'cursor-pointer hover:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)]',
          )}
          aria-label={hasCustomPhoto ? 'Change profile photo' : 'Upload profile photo'}
        >
          <UserAvatar
            name={name}
            email={email}
            avatarPath={avatarPath}
            oauthPictureUrl={oauthPictureUrl}
            size="xl"
            className="size-20 sm:size-24"
            fallbackClassName="text-xl font-semibold"
          />
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin text-white" />
            ) : (
              <Camera className="size-6 text-white" />
            )}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Profile photo
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Shown on your dashboard and account menu. JPG, PNG, or WEBP · max 2 MB. Square photos work best.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {hasCustomPhoto ? 'Change photo' : 'Upload photo'}
          </Button>
          {hasCustomPhoto ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className="text-destructive hover:text-destructive"
              onClick={() => void removePhoto()}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
