import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const s = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isHolder = !!(s.ojLock.holder && fp && s.ojLock.holder === fp)
  if (!(role === 'super_admin' || isHolder)) return new NextResponse('forbidden', { status: 403 })

  let names: string[] = []
  try {
    const body = await req.json()
    names = Array.isArray(body?.names) ? body.names : []
  } catch {}

  let removed = 0
  for (const [k, v] of Object.entries(s.activeSessions)) {
    if (names.includes((v as any).name)) {
      delete s.activeSessions[k]
      removed++
    }
  }
  writeState(s)
  return NextResponse.json({ ok: true, removed })
}
