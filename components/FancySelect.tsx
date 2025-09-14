'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Option = { value: string; label: string }

export default function FancySelect({
  options,
  value,
  placeholder = 'Select',
  onChange,
  className = '',
}: {
  options: Array<string | Option>
  value: string
  placeholder?: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const list: Option[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label }
  )

  const selected = list.find((o) => o.value === value)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!rootRef.current) return
      const clickedInsideTrigger = rootRef.current.contains(target)
      const clickedInsideMenu = menuRef.current?.contains(target)
      if (!clickedInsideTrigger && !clickedInsideMenu) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: Math.round(r.bottom + 8), left: Math.round(r.left), width: Math.round(r.width) })
    }
    update()
    const onScroll = () => update()
    const onResize = () => update()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-64 flex items-center justify-between rounded-xl border border-border bg-surface backdrop-blur-md px-4 py-2 text-sm shadow-lg transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'text-subtext'}>{selected ? selected.label : placeholder}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && menuPos && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 1000 }} className="max-h-72 overflow-auto rounded-2xl border border-border bg-surface backdrop-blur-xl shadow-2xl transition-all">
          <ul role="listbox" aria-activedescendant={selected?.value || ''} className="py-2">
            {list.map((o) => {
              const isSelected = o.value === value
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    const nextVal = isSelected ? '' : o.value
                    onChange(nextVal)
                    setOpen(false)
                  }}
                  className={`mx-2 my-1 flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                    isSelected ? 'bg-primary text-white' : 'hover:bg-primary/10 text-text'
                  }`}
                >
                  <span className="pr-4">{o.label}</span>
                  {isSelected && (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.01 7.01a1 1 0 01-1.42 0l-3.29-3.29a1 1 0 111.42-1.42l2.58 2.59 6.3-6.3a1 1 0 011.42 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      , document.body)}
    </div>
  )
}


