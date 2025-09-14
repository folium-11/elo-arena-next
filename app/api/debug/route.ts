import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { currentSession, decodeSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  // Only allow in non-production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const sid = cookies().get('sid')?.value
  const { session } = currentSession()
  const decodedSession = decodeSession(sid)
  const h = headers()
  
  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      hasSuperAdminPassword: !!process.env.SUPER_ADMIN_PASSWORD,
      hasSessionSecret: !!(process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET),
      adminPasswordLength: process.env.ADMIN_PASSWORD?.length || 0,
      superAdminPasswordLength: process.env.SUPER_ADMIN_PASSWORD?.length || 0,
    },
    cookies: {
      hasSid: !!sid,
      sidLength: sid?.length || 0,
      sidPreview: sid ? sid.substring(0, 20) + '...' : null,
    },
    session: {
      hasSession: !!session,
      sessionId: session?.id,
      sessionRoles: session?.roles,
      sessionExpAt: session?.expAt,
      sessionCreatedAt: session?.createdAt,
      sessionLastSeen: session?.lastSeen,
    },
    decodedSession: {
      hasDecodedSession: !!decodedSession,
      decodedId: decodedSession?.id,
      decodedRoles: decodedSession?.roles,
      decodedExpAt: decodedSession?.expAt,
    },
    headers: {
      userAgent: h.get('user-agent')?.substring(0, 50) + '...',
      xForwardedFor: h.get('x-forwarded-for'),
      host: h.get('host'),
    },
    timing: {
      now: new Date().toISOString(),
      timestamp: Date.now(),
    }
  }

  return NextResponse.json(debug)
}
