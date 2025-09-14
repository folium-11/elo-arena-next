'use client'

import { useEffect, useState } from 'react'
import { ThemeToggleButton } from './theme/ThemeToggleButton'

type Theme = 'dark' | 'light'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const stored = (localStorage.getItem('theme') as Theme | null) || (root.getAttribute('data-theme') as Theme | null)
    const initial: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark'
    setTheme(initial)
    root.setAttribute('data-theme', initial)
    setMounted(true)
  }, [])

  function handleToggle() {
    // 2) inject wipe CSS for this one transition
    const css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) { animation: none; }
        ::view-transition-new(root) { animation: wipe-in 420ms ease-out both; }
        @keyframes wipe-in {
          from { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
          to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        }
      }
    `
    const style = (document.getElementById('vt-wipe') as HTMLStyleElement | null) ?? Object.assign(document.createElement('style'), { id: 'vt-wipe' })
    style.textContent = css
    if (!style.isConnected) document.head.appendChild(style)
    const cleanup = () => setTimeout(() => { try { style.remove() } catch {} }, 600)

    // 1) flip theme inside a View Transition
    const flip = () => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark'
      setTheme(next)
      const root = document.documentElement
      root.setAttribute('data-theme', next)
      try { localStorage.setItem('theme', next) } catch {}
    }

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(flip).finished.finally(cleanup)
    } else {
      // 4) graceful fallback (no wipe)
      flip()
      cleanup()
    }
  }

  if (!mounted) return null

  return (
    <ThemeToggleButton
      theme={theme}
      onClick={handleToggle}
      variant="polygon"
      aria-label="Toggle theme"
    />
  )
}
