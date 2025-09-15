import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createSession, decodeSession } from '@/lib/auth'
import { readState } from '@/lib/state'

export const runtime = 'nodejs'

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  // Compare equal-length arrays to avoid timing leaks
  const pb = new Uint8Array(ab.length)
  const qb = new Uint8Array(ab.length)
  pb.set(ab.subarray(0, ab.length))
  qb.set(bb.subarray(0, Math.min(bb.length, pb.length)))
  return crypto.timingSafeEqual(pb, qb) && a.length === b.length
}

export async function POST(req: NextRequest) {
  const { password = '' } = await req.json().catch(() => ({ password: '' }))
  const adminEnv = process.env.ADMIN_PASSWORD || ''
  const superEnv = process.env.SUPER_ADMIN_PASSWORD || ''

  // Debug logging for Vercel
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[admin/login/debug] Environment check:', {
      hasAdminEnv: !!adminEnv,
      hasSuperEnv: !!superEnv,
      adminEnvLength: adminEnv?.length || 0,
      superEnvLength: superEnv?.length || 0,
      passwordLength: password?.length || 0
    })
  }

  if (!adminEnv && !superEnv) {
    const res = NextResponse.json({ error: 'env_missing', message: 'Admin passwords are not configured' }, { status: 500 })
    res.headers.set('x-debug', 'env_missing')
    return res
  }

  let role: 'admin' | 'super_admin' | null = null
  if (superEnv && safeEqual(password, superEnv)) {
    role = 'super_admin'
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/login/debug] Super admin password matched')
    }
  } else if (adminEnv && safeEqual(password, adminEnv)) {
    role = 'admin'
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/login/debug] Admin password matched')
    }
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/login/debug] No password matched')
    }
  }

  if (!role) {
    const res = NextResponse.json({ error: 'wrong_password', message: 'Incorrect password' }, { status: 401 })
    res.headers.set('x-debug', 'wrong_password')
    return res
  }

  // Enforce single active Super Admin session (check current session)
  if (role === 'super_admin') {
    const currentSid = cookies().get('sid')?.value
    if (currentSid) {
      // Check if current session is already super admin
      const currentSession = decodeSession(currentSid)
      if (currentSession && currentSession.roles.includes('super_admin')) {
        // Already super admin, allow login
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[admin/login/debug] Already super admin, allowing login')
        }
      } else {
        // Someone else might be super admin, but we can't check stateless sessions
        // For now, allow multiple super admin sessions (can be restricted later if needed)
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[admin/login/debug] No existing super admin session found, allowing login')
        }
      }
    }
  }

  // Establish a server-side session used by protected routes and CSRF
  const sess = createSession([role])

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[admin/login/debug] Created session:', { 
      id: sess.id, 
      roles: sess.roles,
      expAt: sess.expAt,
      createdAt: sess.createdAt,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL,
      hasSessionSecret: !!(process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET),
      sessionSecretLength: (process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || '').length
    })
  }

  const response = NextResponse.json({ ok: true, role, csrf: sess.csrfSecret })
  response.headers.set('x-debug', 'session_created')
  return response
}
