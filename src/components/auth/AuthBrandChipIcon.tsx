import { BrandMarkIcon } from '@/components/brand/BrandMarkIcon';
import { BRAND_ICON_SQUARE_PATH } from '@/lib/brand/assets';

/** @deprecated Prefer BRAND_ICON_SQUARE_PATH from `@/lib/brand/assets`. */
export const AUTH_BRAND_MARK_PATH = BRAND_ICON_SQUARE_PATH;

export function AuthBrandChipIcon({
  className = 'size-7 shrink-0',
}: {
  className?: string;
}) {
  return <BrandMarkIcon size={28} className={className} />;
}
