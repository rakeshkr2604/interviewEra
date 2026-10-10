import Image from 'next/image';
import { BRAND_PURPLE_MARK_PATH } from '@/lib/brand/assets';
import { cn } from '@/lib/utils';

type BrandMarkIconProps = {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

/**
 * Compact purple IE monogram for chrome (sidebar, auth, navbar dark/compact).
 * Transparent plate — no squircle “app icon” box on dark backgrounds.
 */
export function BrandMarkIcon({
  size = 44,
  className,
  alt = '',
  priority = false,
}: BrandMarkIconProps) {
  return (
    <Image
      src={BRAND_PURPLE_MARK_PATH}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      alt={alt}
      priority={priority}
      unoptimized
      aria-hidden={alt === '' ? true : undefined}
    />
  );
}
