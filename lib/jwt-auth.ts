import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

export type Role = 'admin' | 'super_admin'

export async function getCurrentUser(): Promise<{ role: Role | 'none'; error?: NextResponse }> {
  const token = cookies().get('sid')?.value
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[jwt-auth/debug] No token found')
    }
    return { role: 'none' }
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '')
    if (!process.env.AUTH_SECRET) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[jwt-auth/debug] AUTH_SECRET not set')
      }
      return { role: 'none' }
    }
    
    const { payload } = await jwtVerify(token, secret)
    const role = payload.role === 'super_admin' ? 'super_admin'
              : payload.role === 'admin' ? 'admin'
              : 'none'
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[jwt-auth/debug] JWT verified successfully:', { role, exp: payload.exp })
    }
    
    return { role }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[jwt-auth/debug] JWT verification failed:', error)
    }
    cookies().set('sid', '', { httpOnly: true, path: '/', maxAge: 0 })
    return { role: 'none' }
  }
}

export function requireAuth(allowedRoles: Role[] = ['admin', 'super_admin']) {
  return async function(req: any) {
    const { role, error } = await getCurrentUser()
    if (error) return { error }
    
    if (role === 'none' || !allowedRoles.includes(role as Role)) {
      return { error: new NextResponse('unauthorized', { status: 401 }) }
    }
    
    return { role: role as Role }
  }
}
