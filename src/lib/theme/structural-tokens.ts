/**
 * Theme-independent layout tokens (radius, shadow, motion, focus).
 * Applied via ThemeProvider and mirrored in globals.css for SSR.
 */
export const STRUCTURAL_TOKENS: Record<string, string> = {
  /* Radius — preserves existing UI values (no visual redesign) */
  '--ie-radius-sm': '0.5rem', /* 8px — shadcn rounded-lg */
  '--ie-radius-md': '0.75rem', /* 12px — auth fields, rounded-xl */
  '--ie-radius-lg': '1.25rem', /* 20px — pricing cards */
  '--ie-radius-xl': '22px', /* dashboard-premium-card, FreeToolFormCard */
  '--ie-radius-2xl': '1.5rem', /* 24px — lg dashboard-premium-card */

  /* Elevation — aliases existing shadows */
  '--ie-shadow-sm': '0 1px 2px rgba(15, 23, 42, 0.04)',
  '--ie-shadow-md': 'var(--card-shadow)',
  '--ie-shadow-lg':
    '0 12px 40px -8px rgba(0, 0, 0, 0.25)',
  '--ie-shadow-card':
    'var(--card-shadow), 0 0 64px color-mix(in srgb, var(--accent-primary) 12%, transparent), 0 0 0 1px color-mix(in srgb, white 45%, transparent) inset',

  /* Motion */
  '--ie-duration-fast': '150ms',
  '--ie-duration-normal': '200ms',
  '--ie-duration-slow': '220ms',
  '--ie-ease-standard': 'ease',

  /* Focus — shared accent ring (auth fields, links, interactive surfaces) */
  '--ie-focus-border': 'color-mix(in srgb, var(--accent-primary) 45%, var(--card-border))',
  '--ie-focus-ring': 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
}
