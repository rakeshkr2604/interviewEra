import Image from 'next/image';

export const AUTH_BRAND_MARK_PATH = '/brand/logos/icon-only.svg';

export function AuthBrandChipIcon({
  className = 'size-7 shrink-0 rounded-md drop-shadow-[0_1px_2px_rgb(15_23_42/12%)] ring-1 ring-black/[0.06]',
}: {
  className?: string;
}) {
  return (
    <Image
      src={AUTH_BRAND_MARK_PATH}
      width={28}
      height={28}
      className={className}
      alt=""
      aria-hidden
    />
  );
}
