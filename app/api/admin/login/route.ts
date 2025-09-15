import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a || '', 'utf8')
  const B = Buffer.from(b || '', 'utf8')
  if (A.length !== B.length) return false
  return crypto.timingSafeEqual(A, B)
}

export async function POST(req: NextRequest) {
  const { password = '' } = await req.json().catch(() => ({ password: '' }))
  const superEnv = process.env.SUPER_ADMIN_PASSWORD || ''
  const adminEnv = process.env.ADMIN_PASSWORD || ''
  const secure = process.env.NODE_ENV === 'production'

  let role: 'admin' | 'super_admin' | null = null
  if (superEnv && safeEqual(password, superEnv)) role = 'super_admin'
  else if (adminEnv && safeEqual(password, adminEnv)) role = 'admin'
  if (!role) return new NextResponse('invalid', { status: 401 })

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '')
  if (!process.env.AUTH_SECRET) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/login/debug] AUTH_SECRET not set')
    }
    return new NextResponse('AUTH_SECRET not configured', { status: 500 })
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[admin/login/debug] Creating JWT for role:', role)
  }
  
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const res = NextResponse.json({ ok: true, role })
  cookies().set('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  res.headers.set('Cache-Control', 'no-store, private, max-age=0')
  return res
}
