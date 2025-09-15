import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const s = readState()
  const overrides = s.nameOverrides || {}
  const items = (s.items || []).map((it: any) => {
    const o = String(overrides[it.id] ?? '').trim()
    return o ? { ...it, name: o } : it
  })

  const res = NextResponse.json({
    ...s,
    items,
    debug: process.env.NODE_ENV !== 'production' ? { envSet: {
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
      SUPER_ADMIN_PASSWORD: !!process.env.SUPER_ADMIN_PASSWORD,
      SESSION_SECRET: !!process.env.SESSION_SECRET || !!process.env.NEXTAUTH_SECRET,
    }} : undefined,
  })
  res.headers.set('Cache-Control', 'no-store, private, max-age=0')
  return res
}
