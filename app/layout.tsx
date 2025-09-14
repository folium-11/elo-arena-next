import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import ThemeToggle from '@/components/ThemeToggle'
import { Montserrat } from 'next/font/google'

// Self-hosted Montserrat; Next.js downloads at build time and serves locally
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
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className="font-sans">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
          <div className="min-h-screen bg-bg text-text">
            <header className="sticky top-0 z-10 border-b border-border bg-bg backdrop-blur">
              <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                <a href="/" className="font-semibold tracking-tight">Elo Arena</a>
                <nav className="flex items-center gap-3">
                  <a
                    href="/admin/"
                    className="rounded-md px-3 py-1.5 bg-surface border border-border hover:border-primary"
                  >
                    Admin
                  </a>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
