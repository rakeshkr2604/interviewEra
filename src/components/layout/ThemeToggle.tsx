'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme/ThemeProvider'

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border p-2 transition-[transform,opacity] duration-200
                 border-(--card-border) bg-(--card-bg)
                 text-(--text-secondary) hover:text-(--text-primary)
                 hover:border-(--accent-primary)/40"
    >
      {resolvedTheme === 'dark'
        ? <Sun size={16} />
        : <Moon size={16} />
      }
    </button>
  )
}
