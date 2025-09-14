import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'
import { cookies } from 'next/headers'

export async function GET() {
  const s = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isHolder = !!(s.ojLock.holder && fp && s.ojLock.holder === fp)
  if (!(role === 'super_admin' || isHolder)) return new NextResponse('forbidden', { status: 403 })

  const body = JSON.stringify(s, null, 2)
  return new NextResponse(body, {
    headers: {
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="arena-export.json"',
    },
  })
}
