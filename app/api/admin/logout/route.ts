import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  cookies().set('sid', '', { httpOnly: true, path: '/', maxAge: 0 })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
