import { NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export async function POST() {
  const s = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isHolder = !!(s.ojLock.holder && fp && s.ojLock.holder === fp)
  if (!(role === 'super_admin' || isHolder)) return new NextResponse('forbidden', { status: 403 })

  const next = {
    // Preserve sign-in config & sessions
    signInEnabled: s.signInEnabled,
    allowedNames: s.allowedNames,
    slotLimits: s.slotLimits,
    extraSlots: s.extraSlots,
    activeSessions: s.activeSessions,

    // Reset arena content
    arenaTitle: 'Arena',
    items: [] as any[],
    globalRatings: {} as Record<string, number>,
    perUserRatings: {} as Record<string, Record<string, number>>,
    wins: {} as Record<string, number>,
    appearances: {} as Record<string, number>,
    nameOverrides: {} as Record<string, string>,
    contributions: {} as Record<string, number>,
    ojLock: s.ojLock, // unchanged
    activePairs: {} as Record<string, [string, string]>,
  }

  writeState(next as any)
  return NextResponse.json({ ok: true })
}
