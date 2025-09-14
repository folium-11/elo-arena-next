import { NextResponse } from 'next/server'
import { currentSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const { session } = currentSession()
  if (!session) return NextResponse.json({ role: 'none' })
  const role: 'admin' | 'super_admin' = session.roles.includes('super_admin') ? 'super_admin' : 'admin'
  // Expose CSRF secret to the client so it can be sent with state-changing requests
  return NextResponse.json({ role, csrf: session.csrfSecret, debug: { expAt: session.expAt } })
}
