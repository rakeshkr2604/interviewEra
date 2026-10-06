/**
 * Canonical production paths for InterviewEra Logo Package v1.
 * Source kit: InterviewEra_Logo_Package_v1/InterviewEra_Logo_Package_v1/
 * Served tree: public/brand/** + public/favicon/**
 *
 * Prefer WebP for UI lockups; PNGs remain for favicon/PWA/social tooling.
 */

/** Approved approximate web colors (public/brand/BRAND_COLORS.txt). */
export const BRAND_COLORS = {
  deepNavy: '#09062D',
  primaryPurple: '#5B21F4',
  secondaryViolet: '#9B6CFF',
  background: '#FFFFFF',
  neutralGray: '#6B7280',
} as const

/** Approved package tagline — render as live text at small UI sizes (raster microtype blurs). */
export const BRAND_TAGLINE = 'PRACTICE • PREPARE • PROGRESS' as const
export const BRAND_TAGLINE_PARTS = ['PRACTICE', 'PREPARE', 'PROGRESS'] as const

/** Cropped UI square mark (board chrome removed; transparent plate). */
export const BRAND_ICON_SQUARE_PATH = '/brand/icons/ui/interviewera-icon-square.webp' as const
export const BRAND_ICON_SQUARE_PNG_PATH = '/brand/icons/ui/interviewera-icon-square.png' as const

/** Circular mark — only where a circular presentation is intended. */
export const BRAND_ICON_CIRCLE_PATH = '/brand/icons/ui/interviewera-icon-circle.webp' as const

/** Full lockups — UI crops (board captions removed); white-first on a light plate in dark chrome. */
export const BRAND_LOGO_HORIZONTAL_PATH = '/brand/primary/ui/interviewera-horizontal.webp' as const
/** Navbar monogram (full IE from vertical board — horizontal extract clips the I). */
/** Navbar IE mark — bump query when regenerate `prepare-logo-package-v1`. */
export const BRAND_MONOGRAM_NAV_PATH = '/brand/primary/ui/interviewera-monogram-nav.png?v=5' as const
/** Navbar wordmark-only (InterviewEra). */
export const BRAND_WORDMARK_NAV_PATH = '/brand/primary/ui/interviewera-wordmark-nav.png' as const
export const BRAND_LOGO_VERTICAL_PATH = '/brand/primary/ui/interviewera-primary-vertical.webp' as const
export const BRAND_LOGO_STACKED_PATH = '/brand/primary/ui/interviewera-stacked.webp' as const

/** @deprecated Prefer BRAND_ICON_SQUARE_PATH — kept as alias for compact mark slots. */
export const BRAND_MARK_PATH = BRAND_ICON_SQUARE_PATH

/** Launcher / JSON-LD Organization logo (192×192 PNG). */
export const BRAND_ICON_192_PATH = '/favicon/android-chrome-192x192.png' as const

export const BRAND_FAVICON_ICO_PATH = '/favicon.ico' as const
export const BRAND_APPLE_TOUCH_ICON_PATH = '/favicon/apple-touch-icon.png' as const

/** Social profile kit (not OG 1200×630). */
export const BRAND_SOCIAL = {
  linkedin: '/brand/social/interviewera-linkedin.png',
  twitter: '/brand/social/interviewera-twitter-x.png',
  instagram: '/brand/social/interviewera-instagram.png',
  youtube: '/brand/social/interviewera-youtube.png',
} as const
