import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = readState()
  if (!s.signInEnabled) return new NextResponse('sign_in_disabled', { status: 400 })

  const did = cookies().get('did')?.value
  if (!did) return new NextResponse('device_missing', { status: 401 })

  let name = ''
  try {
    const b = await req.json()
    name = String(b?.name || '').trim()
  } catch {
    return new NextResponse('bad_payload', { status: 400 })
  }
  if (!name) return new NextResponse('bad_name', { status: 400 })

  if (Array.isArray(s.allowedNames) && s.allowedNames.length > 0) {
    if (!s.allowedNames.includes(name)) return new NextResponse('not_allowed', { status: 403 })
  }

  // per-name slot limits
  const base = Number.isFinite(s.slotLimits?.[name]) ? Math.max(0, Math.floor(s.slotLimits[name])) : 1
  const extra = Number.isFinite(s.extraSlots?.[name]) ? Math.max(0, Math.floor(s.extraSlots[name])) : 0
  const limit = base + extra

  const counts: Record<string, number> = {}
  Object.values(s.activeSessions || {}).forEach((v: any) => {
    if (!v?.name) return
    counts[v.name] = (counts[v.name] || 0) + 1
  })
  if ((counts[name] || 0) >= limit) return new NextResponse('name_full', { status: 409 })

  s.activeSessions = s.activeSessions || {}
  s.activeSessions[did] = { name, since: new Date().toISOString() }
  writeState(s)

  return NextResponse.json({ ok: true, name })
}
