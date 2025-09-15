'use client'

import * as React from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ThemeMode = 'light' | 'dark'

interface ThemeToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme: ThemeMode | (string & {})
  variant?: 'polygon'
}

export function ThemeToggleButton({
  theme,
  variant = 'polygon',
  className,
  ...props
}: ThemeToggleButtonProps) {
  const [wiping, setWiping] = React.useState(false)
  const prevThemeRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (prevThemeRef.current === null) {
      prevThemeRef.current = String(theme)
      return
    }
    if (prevThemeRef.current !== theme) {
      setWiping(true)
      const t = setTimeout(() => setWiping(false), 350)
      prevThemeRef.current = String(theme)
      return () => clearTimeout(t)
    }
  }, [theme])

  const isLight = String(theme) === 'light'

  return (
    <Button
      type="button"
      variant="circle"
      size="icon"
      className={cn(
        'relative overflow-hidden transition-colors',
        isLight ? 'text-text' : 'text-text',
        className,
      )}
      aria-pressed={isLight}
      {...props}
    >
      <span className="relative z-[2] grid place-items-center">
        <Sun
          className={cn(
            'absolute transition-opacity duration-200',
            isLight ? 'opacity-100' : 'opacity-0',
          )}
        />
        <Moon
          className={cn(
            'absolute transition-opacity duration-200',
            isLight ? 'opacity-0' : 'opacity-100',
          )}
        />
      </span>
      {variant === 'polygon' && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] [background:linear-gradient(135deg,theme(colors.primary)_0%,theme(colors.primary)/90_60%,transparent_60%)]',
            wiping ? 'animate-tt-wipe' : 'opacity-0',
          )}
        />
      )}

      <style jsx>{`
        @keyframes tt-wipe {
          0% { transform: translate3d(-120%, -120%, 0) rotate(0.0001deg); opacity: .9; }
          50% { opacity: .9; }
          100% { transform: translate3d(120%, 120%, 0) rotate(0.0001deg); opacity: 0; }
        }
        :global(.animate-tt-wipe) {
          animation: tt-wipe 350ms ease-in-out forwards;
        }
      `}</style>
    </Button>
  )
}


