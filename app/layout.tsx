import './globals.css'
import type { Metadata } from 'next'
import ThemeToggle from '@/components/ThemeToggle'
import ScrollKeeper from '@/components/ScrollKeeper'
import DialogProvider from '@/components/DialogProvider'
import { Montserrat } from 'next/font/google'
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Elo Arena',
  description: 'Minimal Elo voting arena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans">
          <DialogProvider>
            <div className="min-h-screen bg-bg text-text relative">
              <div className="atmosphere" />
              <header className="sticky top-0 z-10 border-b border-border bg-bg backdrop-blur-md">
              <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
                <a href="/" className="font-semibold tracking-tight">Elo Arena</a>
                <nav className="flex items-center gap-3">
                  <a
                    href="/admin/"
                    className="rounded-full px-4 py-2 bg-surface border border-border hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
                  >
                    Admin
                  </a>
                  <ThemeToggle />
                </nav>
              </div>
              </header>
              <main className="mx-auto max-w-6xl px-6 py-10">
                <ScrollKeeper />
                {children}
              </main>
            </div>
          </DialogProvider>
      </body>
    </html>
  )
}
