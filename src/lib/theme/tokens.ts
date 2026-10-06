import { STRUCTURAL_TOKENS } from './structural-tokens'

/**
 * App-wide semantic tokens (dashboard, auth, tools, marketing chrome).
 * Kept in sync with `html[data-theme=*]` in globals.css so light/dark match everywhere.
 *
 * STRUCTURAL_TOKENS (radius, shadow, motion, focus) are theme-independent and merged at apply time.
 */
export const DARK_TOKENS: Record<string, string> = {
  '--bg-primary': '#0a0f1e',
  '--bg-secondary': '#111827',
  '--bg-tertiary': '#1e293b',
  '--card-bg': 'rgba(22, 30, 49, 0.94)',
  '--card-border': 'rgba(255, 255, 255, 0.1)',
  '--card-shadow': '0 12px 48px rgba(0, 0, 0, 0.45)',
  '--text-primary': '#f8fafc',
  '--text-secondary': '#94a3b8',
  '--text-muted': '#8b9cb3',
  '--accent-primary': '#4f46e5',
  '--accent-link': '#a5b4fc',
  '--accent-hover': '#818cf8',
  '--accent-success': '#34d399',
  '--accent-warning': '#f59e0b',
  '--accent-danger': '#f87171',
  '--avatar-glow': 'rgba(79, 70, 229, 0.3)',
  '--page-gradient':
    'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(99, 102, 241, 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(139, 92, 246, 0.08), transparent), #0a0f1e',
  '--v3-bord': 'rgba(255, 255, 255, 0.07)',
  '--v3-accdim': 'rgba(99, 102, 241, 0.10)',
  '--v3-accbrd': 'rgba(99, 102, 241, 0.25)',
  '--v3-okdim': 'rgba(16, 185, 129, 0.10)',
  '--v3-ok-brd': 'rgba(16, 185, 129, 0.20)',
  '--v3-pur': '#a78bfa',
  '--v3-cta-bg': 'linear-gradient(160deg, #0d173a 0%, #120f38 50%, #0d1634 100%)',
  '--v3-cta-brd': 'rgba(255, 255, 255, 0.15)',
}

export const LIGHT_TOKENS: Record<string, string> = {
  '--bg-primary': '#f8fafc',
  '--bg-secondary': '#f1f5f9',
  '--bg-tertiary': '#e2e8f0',
  '--card-bg': 'rgba(255, 255, 255, 0.98)',
  '--card-border': 'rgba(79, 70, 229, 0.18)',
  '--card-shadow':
    '0 12px 48px rgba(79, 70, 229, 0.08), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
  '--text-primary': '#0f172a',
  '--text-secondary': '#334155',
  '--text-muted': '#475569',
  '--accent-primary': '#4f46e5',
  '--accent-link': '#4338ca',
  '--accent-hover': '#6366f1',
  '--accent-success': '#15803d',
  '--accent-warning': '#d97706',
  '--accent-danger': '#b91c1c',
  '--avatar-glow': 'rgba(79, 70, 229, 0.22)',
  '--page-gradient':
    'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(99, 102, 241, 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(139, 92, 246, 0.08), transparent), #f8fafc',
  '--v3-bord': 'rgba(79, 70, 229, 0.14)',
  '--v3-accdim': 'rgba(79, 70, 229, 0.08)',
  '--v3-accbrd': 'rgba(79, 70, 229, 0.24)',
  '--v3-okdim': 'rgba(5, 150, 105, 0.08)',
  '--v3-ok-brd': 'rgba(5, 150, 105, 0.35)',
  '--v3-pur': '#5B21F4',
  '--v3-cta-bg': 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)',
  '--v3-cta-brd': 'rgba(79, 70, 229, 0.2)',
}

/** All tokens applied to documentElement — color tokens follow resolved theme. */
export function tokensForTheme(resolved: 'dark' | 'light'): Record<string, string> {
  const color = resolved === 'dark' ? DARK_TOKENS : LIGHT_TOKENS
  return { ...STRUCTURAL_TOKENS, ...color }
}

export { STRUCTURAL_TOKENS }
