'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { AVATAR_BUCKET } from '@/lib/profile/avatar';
import { getUserInitials } from '@/lib/profile/user-display';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-16 text-lg',
} as const;

export function UserAvatar({
  name,
  email,
  avatarPath,
  oauthPictureUrl,
  size = 'md',
  className,
  fallbackClassName,
}: {
  name: string | null | undefined;
  email: string;
  avatarPath?: string | null;
  oauthPictureUrl?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  fallbackClassName?: string;
}) {
  const imageSrc = useMemo(() => {
    if (avatarPath) {
      const supabase = createClient();
      return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl;
    }
    return oauthPictureUrl ?? null;
  }, [avatarPath, oauthPictureUrl]);

  const initials = getUserInitials(name, email);

  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      {imageSrc ? (
        <AvatarImage src={imageSrc} alt={name?.trim() ? `${name} profile photo` : 'Your profile photo'} />
      ) : null}
      <AvatarFallback
        className={cn('font-semibold', fallbackClassName)}
        style={
          fallbackClassName
            ? undefined
            : {
                background:
                  'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
                color: '#fff',
              }
        }
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
