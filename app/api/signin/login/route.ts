import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

function sessionsByName(s: ReturnType<typeof readState>) {
  const by: Record<string, number> = {}
  Object.values(s.activeSessions || {}).forEach((v: any) => {
    if (!v?.name) return
    by[v.name] = (by[v.name] || 0) + 1
  })
  return by
}

export async function POST(req: NextRequest) {
  const s = readState()
  if (!s.signInEnabled) return new NextResponse('sign_in_disabled', { status: 400 })

  let name = ''
  try {
    const b = await req.json()
    name = String(b?.name || '').trim()
  } catch {
    return new NextResponse('bad payload', { status: 400 })
  }
  if (!name) return new NextResponse('bad_name', { status: 400 })

  // Allowlist
  if (Array.isArray(s.allowedNames) && s.allowedNames.length > 0) {
    if (!s.allowedNames.includes(name)) return new NextResponse('not_allowed', { status: 403 })
  }

  // Slot enforcement
  const base = Number.isFinite(s.slotLimits?.[name]) ? Math.max(0, Math.floor(s.slotLimits[name])) : 1
  const extra = Number.isFinite(s.extraSlots?.[name]) ? Math.max(0, Math.floor(s.extraSlots[name])) : 0
  const limit = base + extra
  const counts = sessionsByName(s)
  if ((counts[name] || 0) >= limit) return new NextResponse('name_full', { status: 409 })

  // Ensure fingerprint
  let fp = cookies().get('fp')?.value
  if (!fp) {
    fp = crypto.randomUUID()
    cookies().set('fp', fp, { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  }

  // Bind session
  s.activeSessions[fp] = { name, since: new Date().toISOString() }
  writeState(s)

  // IMPORTANT: do NOT clear the admin role cookie here.
  // Users can be signed-in voters and also have an admin session in another tab.
  return NextResponse.json({ ok: true, name })
}
