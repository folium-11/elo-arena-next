import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { getCurrentUser } from '@/lib/jwt-auth'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const sid = cookies().get('sid')?.value
  const { role } = await getCurrentUser()
  const h = headers()
  
  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      hasSuperAdminPassword: !!process.env.SUPER_ADMIN_PASSWORD,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      adminPasswordLength: process.env.ADMIN_PASSWORD?.length || 0,
      superAdminPasswordLength: process.env.SUPER_ADMIN_PASSWORD?.length || 0,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
    },
    cookies: {
      hasSid: !!sid,
      sidLength: sid?.length || 0,
      sidPreview: sid ? sid.substring(0, 20) + '...' : null,
    },
    session: {
      role: role,
      hasValidSession: role !== 'none',
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
