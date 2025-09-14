'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollKeeper() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `scroll:${pathname || '/'}`

    // Restore scroll on mount for this path
    const raw = sessionStorage.getItem(key)
    const y = raw ? parseInt(raw, 10) : 0
    if (Number.isFinite(y) && y > 0) {
      // Use requestAnimationFrame to wait for paint
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'auto' }))
    }

    const onScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY || 0))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  return null
}


