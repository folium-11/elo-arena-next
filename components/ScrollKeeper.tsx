'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollKeeper() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `scroll:${pathname || '/'}`
    const raw = sessionStorage.getItem(key)
    const y = raw ? parseInt(raw, 10) : 0
    if (Number.isFinite(y) && y > 0) {
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


