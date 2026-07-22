'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { tokensForTheme } from './tokens'

export type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('ie-theme') as Theme) ?? 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const resolve = (): 'dark' | 'light' => {
      if (theme === 'system') return mediaQuery.matches ? 'dark' : 'light'
      return theme
    }
    const apply = () => {
      const resolved = resolve()
      queueMicrotask(() => setResolvedTheme(resolved))
      const root = document.documentElement
      // SSR already sets data-theme (+ dark class) via the layout inline
      // script; globals.css owns the token values. Re-writing ~30 CSS
      // variables on every mount forces a full RecalcStyle — skip when
      // nothing actually changed (mount match or no-op toggle).
      const themeUnchanged =
        root.getAttribute('data-theme') === resolved &&
        root.classList.contains('dark') === (resolved === 'dark')
      if (themeUnchanged) return

      const tokens = tokensForTheme(resolved)
      for (const [key, value] of Object.entries(tokens)) {
        if (root.style.getPropertyValue(key) !== value) {
          root.style.setProperty(key, value)
        }
      }
      root.setAttribute('data-theme', resolved)
      root.classList.toggle('dark', resolved === 'dark')
    }
    apply()
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('ie-theme', t)
  }

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
