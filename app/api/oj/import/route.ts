import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const current = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isHolder = !!(current.ojLock.holder && fp && current.ojLock.holder === fp)
  if (!(role === 'super_admin' || isHolder)) return new NextResponse('forbidden', { status: 403 })

  let payload: any = {}
  try {
    payload = await req.json()
  } catch {}

  const data = payload?.data ?? payload
  const preserve = !!payload?.preserveSignIn

  if (!data || typeof data !== 'object') return new NextResponse('bad payload', { status: 400 })

  const next = preserve
    ? {
        // Preserve sign-in config and sessions
        signInEnabled: current.signInEnabled,
        allowedNames: current.allowedNames,
        slotLimits: current.slotLimits,
        extraSlots: current.extraSlots,
        activeSessions: current.activeSessions,

        // Import arena content
        arenaTitle: data.arenaTitle ?? 'Arena',
        items: data.items ?? [],
        globalRatings: data.globalRatings ?? {},
        perUserRatings: data.perUserRatings ?? {},
        wins: data.wins ?? {},
        appearances: data.appearances ?? {},
        nameOverrides: data.nameOverrides ?? {},
        contributions: data.contributions ?? {},
        ojLock: current.ojLock, // unchanged
        activePairs: {}, // clear
      }
    : data

  writeState(next)
  return NextResponse.json({ ok: true })
}
