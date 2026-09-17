'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

// The inline script in app/layout.tsx has already set the class before paint.
// This only mirrors it into React state and flips it on click.
function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDark(isDark())
    setReady(true)
  }, [])

  // Follow the OS while the member hasn't made an explicit choice.
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')

    function onChange(event: MediaQueryListEvent) {
      try {
        if (localStorage.getItem('theme')) return
      } catch {
        return
      }
      document.documentElement.classList.toggle('dark', event.matches)
      document.documentElement.style.colorScheme = event.matches ? 'dark' : 'light'
      setDark(event.matches)
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next = !isDark()
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Private browsing: the theme still applies, it just won't persist.
    }
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'brand-chip flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground',
        className
      )}
    >
      {/* Until mounted we don't know the theme, so render a stable icon and let
          the server and client markup match. */}
      {ready && dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
