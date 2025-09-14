import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createSession } from '@/lib/auth'
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

  if (!adminEnv && !superEnv) {
    return NextResponse.json({ error: 'env_missing', message: 'Admin passwords are not configured' }, { status: 500 })
  }

  let role: 'admin' | 'super_admin' | null = null
  if (superEnv && safeEqual(password, superEnv)) role = 'super_admin'
  else if (adminEnv && safeEqual(password, adminEnv)) role = 'admin'

  if (!role) return new NextResponse('invalid', { status: 401 })

  // Enforce single active Super Admin session
  if (role === 'super_admin') {
    const s = readState() as any
    const now = Date.now()
    const currentSid = cookies().get('sid')?.value || ''
    const sessions: Record<string, any> = s.serverSessions || {}
    const someoneElseIsSuperAdmin = Object.entries(sessions).some(([sid, sess]: any) => {
      if (!sess || !Array.isArray(sess.roles)) return false
      const isSuper = sess.roles.includes('super_admin')
      if (!isSuper) return false
      const exp = new Date(sess.expAt || 0).getTime()
      const active = Number.isFinite(exp) ? exp > now : true
      return active && sid !== currentSid
    })
    if (someoneElseIsSuperAdmin) {
      return NextResponse.json(
        { error: 'super_admin_taken', message: 'Another user already has the access level of Super Admin' },
        { status: 409 }
      )
    }
  }

  const secure = process.env.NODE_ENV !== 'development'
  cookies().set('role', role, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Establish a server-side session used by protected routes and CSRF
  const sess = createSession([role])

  return NextResponse.json({ ok: true, role, csrf: sess.csrfSecret })
}
