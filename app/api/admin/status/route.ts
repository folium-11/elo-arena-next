import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headers = new Headers({ 'Cache-Control': 'no-store, private, max-age=0' })

  const token = cookies().get('sid')?.value
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/status/debug] No token found')
    }
    return NextResponse.json({ role: 'none' }, { headers })
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '')
    if (!process.env.AUTH_SECRET) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[admin/status/debug] AUTH_SECRET not set')
      }
      return NextResponse.json({ role: 'none' }, { headers })
    }

    const { payload } = await jwtVerify(token, secret)
    const role = payload.role === 'super_admin' ? 'super_admin'
              : payload.role === 'admin' ? 'admin'
              : 'none'

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/status/debug] JWT verified successfully:', { role, exp: payload.exp })
    }

    return NextResponse.json({ role }, { headers })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[admin/status/debug] JWT verification failed:', error)
    }
    cookies().set('sid', '', { httpOnly: true, path: '/', maxAge: 0 })
    return NextResponse.json({ role: 'none' }, { headers })
  }
}
