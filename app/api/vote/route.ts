import { NextRequest, NextResponse } from 'next/server'
import {
  readState,
  writeState,
  ensureItemStats,
  expectedScore,
  kFactor,
} from '@/lib/state'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const s = readState()
  const body = await req.json()
  const { winnerId, loserId } = body || {}

  // If sign-in is enabled, require an active session
  if (s.signInEnabled) {
    const fp = cookies().get('fp')?.value
    const sess = fp ? s.activeSessions[fp] : null
    if (!sess) return new NextResponse('signin_required', { status: 403 })
  }

  const a = s.items.find((x) => x.id === winnerId)
  const b = s.items.find((x) => x.id === loserId)
  if (!a || !b) return new NextResponse('invalid', { status: 400 })

  // --- Global Elo ---
  ensureItemStats(s, a.id)
  ensureItemStats(s, b.id)
  const rA = s.globalRatings[a.id]
  const rB = s.globalRatings[b.id]
  const ea = expectedScore(rA, rB)
  const eb = expectedScore(rB, rA)
  const k = kFactor()
  s.globalRatings[a.id] = Math.round(rA + k * (1 - ea))
  s.globalRatings[b.id] = Math.round(rB + k * (0 - eb))
  s.wins[a.id] += 1
  s.appearances[a.id] += 1
  s.appearances[b.id] += 1

  // --- Personal Elo when SIGN-IN is enabled & user is signed in ---
  if (s.signInEnabled) {
    const fp = cookies().get('fp')?.value
    const sess = fp ? s.activeSessions[fp] : null
    const name = sess?.name
    if (name) {
      const map = s.perUserRatings[name] || (s.perUserRatings[name] = {})
      if (map[a.id] == null) map[a.id] = 1500
      if (map[b.id] == null) map[b.id] = 1500
      const prA = map[a.id]
      const prB = map[b.id]
      const pea = expectedScore(prA, prB)
      const peb = expectedScore(prB, prA)
      map[a.id] = Math.round(prA + k * (1 - pea))
      map[b.id] = Math.round(prB + k * (0 - peb))
    }
  }

  // Select a fresh valid pair for this fingerprint
  const ids = s.items.map((x) => x.id)
  if (ids.length >= 2) {
    let x = ids[Math.floor(Math.random() * ids.length)]
    let y = ids[Math.floor(Math.random() * ids.length)]
    while (x === y) y = ids[Math.floor(Math.random() * ids.length)]
    const fp2 = cookies().get('fp')?.value
    if (fp2) s.activePairs[fp2] = [x, y]
  }

  writeState(s)
  return NextResponse.json({ ok: true })
}
