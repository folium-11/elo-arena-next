import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readState, writeState } from '@/lib/state'
import {
  assignNewPair,
  buildGlobalLeaderboard,
  buildPersonalLeaderboard,
  sanitizeItemsForClient,
} from '@/lib/arena'

export const runtime = 'nodejs'
const K = 32
function expected(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)) }

export async function POST(req: NextRequest) {
  const s = await readState()
  const body = await req.json().catch(() => null)
  const did = cookies().get('did')?.value || null

  const enabled = !!s.signInEnabled
  const session = did ? s.activeSessions?.[did] : undefined
  if (enabled && !session?.name) return new NextResponse('signin_required', { status: 403 })

  const winnerId = String(body?.winnerId || '')
  const loserId = String(body?.loserId || '')
  if (!winnerId || !loserId || winnerId === loserId) return new NextResponse('bad_payload', { status: 400 })

  s.globalRatings = s.globalRatings || {}
  s.wins = s.wins || {}
  s.appearances = s.appearances || {}

  const wa = s.globalRatings[winnerId] ?? 1500
  const lb = s.globalRatings[loserId] ?? 1500
  const ea = expected(wa, lb), eb = expected(lb, wa)
  s.globalRatings[winnerId] = Math.round(wa + K * (1 - ea))
  s.globalRatings[loserId] = Math.round(lb + K * (0 - eb))
  s.wins[winnerId] = (s.wins[winnerId] || 0) + 1
  s.appearances[winnerId] = (s.appearances[winnerId] || 0) + 1
  s.appearances[loserId] = (s.appearances[loserId] || 0) + 1

  if (did) {
    s.personalRatingsByDevice = s.personalRatingsByDevice || {}
    const map = (s.personalRatingsByDevice[did] = s.personalRatingsByDevice[did] || {})
    const pwa = map[winnerId] ?? 1500
    const plb = map[loserId] ?? 1500
    const pea = expected(pwa, plb), peb = expected(plb, pwa)
    map[winnerId] = Math.round(pwa + K * (1 - pea))
    map[loserId] = Math.round(plb + K * (0 - peb))
  }

  const nextPair = assignNewPair(s, did)
  const persistPromise = writeState(s)
  const globalRows = buildGlobalLeaderboard(s)
  const personal = buildPersonalLeaderboard(s, did)
  const payload = {
    ok: true,
    title: s.arenaTitle || 'Arena',
    items: sanitizeItemsForClient(s),
    itemsCount: (s.items || []).length,
    pair: nextPair,
    globalRows,
    personalMode: personal.mode,
    personalRows: personal.mode === 'signedIn' ? personal.rows : [],
    signInEnabled: !!s.signInEnabled,
    signedIn: personal.signedIn,
    myName: personal.name,
  }
  await persistPromise
  return NextResponse.json(payload)
}
