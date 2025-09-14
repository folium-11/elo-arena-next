import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

function assertPermitted() {
  const s = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isHolder = !!(s.ojLock.holder && fp && s.ojLock.holder === fp)
  if (!(role === 'super_admin' || isHolder)) return null
  return s
}

function summarizeSessionsByName(s: ReturnType<typeof readState>) {
  const by: Record<string, number> = {}
  Object.values(s.activeSessions || {}).forEach((v: any) => {
    if (!v?.name) return
    by[v.name] = (by[v.name] || 0) + 1
  })
  return by
}

export async function GET() {
  const s = assertPermitted()
  if (!s) return new NextResponse('forbidden', { status: 403 })
  return NextResponse.json({
    signInEnabled: s.signInEnabled,
    allowedNames: s.allowedNames,
    slotLimits: s.slotLimits,
    extraSlots: s.extraSlots,
    sessionsByName: summarizeSessionsByName(s),
  })
}

export async function POST(req: NextRequest) {
  const s = assertPermitted()
  if (!s) return new NextResponse('forbidden', { status: 403 })
  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  if (typeof body.signInEnabled === 'boolean') s.signInEnabled = body.signInEnabled

  if (typeof body.allowedNamesText === 'string') {
    const lines = body.allowedNamesText
      .split('\n')
      .map((x: string) => x.trim())
      .filter((x: string) => x.length > 0)
    s.allowedNames = Array.from(new Set(lines))
  }

  if (body.slotLimits && typeof body.slotLimits === 'object') {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(body.slotLimits)) {
      const n = Math.max(0, Math.floor(Number(v)))
      if (k) out[k] = n
    }
    s.slotLimits = out
  }

  if (body.extraSlots && typeof body.extraSlots === 'object') {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(body.extraSlots)) {
      const n = Math.max(0, Math.floor(Number(v)))
      if (k) out[k] = n
    }
    s.extraSlots = out
  }

  writeState(s)
  return NextResponse.json({
    signInEnabled: s.signInEnabled,
    allowedNames: s.allowedNames,
    slotLimits: s.slotLimits,
    extraSlots: s.extraSlots,
    sessionsByName: summarizeSessionsByName(s),
  })
}
