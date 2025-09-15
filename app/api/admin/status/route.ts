import { NextResponse } from 'next/server'
import { currentSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const { session } = currentSession()
  if (!session) {
    const response = NextResponse.json({ role: 'none' })
    response.headers.set('x-debug', 'no_session')
    return response
  }
  const role: 'admin' | 'super_admin' = session.roles.includes('super_admin') ? 'super_admin' : 'admin'
  // Expose CSRF secret to the client so it can be sent with state-changing requests
  const response = NextResponse.json({ role, csrf: session.csrfSecret, debug: { expAt: session.expAt } })
  response.headers.set('x-debug', 'session_valid')
  return response
}
