import { STRUCTURAL_TOKENS } from './structural-tokens'

/**
 * App-wide semantic tokens (dashboard, auth, tools, marketing chrome).
 * Kept in sync with `html[data-theme=*] .ie-landing-premium` in globals.css so light/dark match everywhere.
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
  '--text-muted': '#475569',
  '--accent-primary': '#6366f1',
  '--accent-hover': '#818cf8',
  '--accent-success': '#10b981',
  '--accent-warning': '#f59e0b',
  '--accent-danger': '#ef4444',
  '--avatar-glow': 'rgba(99, 102, 241, 0.3)',
  '--page-gradient':
    'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(99, 102, 241, 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(139, 92, 246, 0.08), transparent), #0a0f1e',
}

export const LIGHT_TOKENS: Record<string, string> = {
  '--bg-primary': '#fafafb',
  '--bg-secondary': '#f4f4f7',
  '--bg-tertiary': '#e8e8ef',
  '--card-bg': 'rgba(255, 255, 255, 0.97)',
  '--card-border': 'rgba(15, 23, 42, 0.11)',
  '--card-shadow':
    '0 8px 40px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
  '--text-primary': '#0a0f1a',
  '--text-secondary': '#334155',
  '--text-muted': '#64748b',
  '--accent-primary': '#4f46e5',
  '--accent-hover': '#6366f1',
  '--accent-success': '#059669',
  '--accent-warning': '#d97706',
  '--accent-danger': '#dc2626',
  '--avatar-glow': 'rgba(79, 70, 229, 0.22)',
  '--page-gradient':
    'radial-gradient(ellipse 90% 60% at 50% -20%, rgba(99, 102, 241, 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(139, 92, 246, 0.08), transparent), #fafafb',
}

/** All tokens applied to documentElement — color tokens follow resolved theme. */
export function tokensForTheme(resolved: 'dark' | 'light'): Record<string, string> {
  const color = resolved === 'dark' ? DARK_TOKENS : LIGHT_TOKENS
  return { ...STRUCTURAL_TOKENS, ...color }
}

export { STRUCTURAL_TOKENS }
