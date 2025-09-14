'use client'

export default function ThemeToggle() {
  return (
    <button
      onClick={() => {
        const root = document.documentElement
        const current = root.getAttribute('data-theme') || 'dark'
        const next = current === 'dark' ? 'light' : 'dark'
        root.setAttribute('data-theme', next)
        localStorage.setItem('theme', next)
      }}
      className="rounded-md px-3 py-1.5 border border-border bg-surface hover:border-primary"
      aria-label="Toggle theme"
    >
      Theme
    </button>
  )
}
