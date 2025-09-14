import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-20 bg-bg overflow-hidden flex items-center justify-center px-6">
      <div className="card-glass max-w-md w-full p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-subtext text-sm">The page you are looking for doesn’t exist.</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}


