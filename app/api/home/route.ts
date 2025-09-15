import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readState, writeState } from '@/lib/state'
import {
  buildGlobalLeaderboard,
  buildPersonalLeaderboard,
  ensureDevicePair,
  sanitizeItemsForClient,
} from '@/lib/arena'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const did = cookies().get('did')?.value || null
  const state = await readState()
  const { pair, mutated } = ensureDevicePair(state, did)
  const items = sanitizeItemsForClient(state)
  const globalRows = buildGlobalLeaderboard(state)
  const personal = buildPersonalLeaderboard(state, did)

  if (mutated) {
    writeState(state).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to persist arena state after assigning pair', err)
      }
    })
  }

  const res = NextResponse.json({
    ok: true,
    title: state.arenaTitle || 'Arena',
    items,
    itemsCount: items.length,
    pair,
    globalRows,
    personalMode: personal.mode,
    personalRows: personal.mode === 'signedIn' ? personal.rows : [],
    signInEnabled: !!state.signInEnabled,
    signedIn: personal.signedIn,
    myName: personal.name,
  })
  res.headers.set('Cache-Control', 'no-store, private, max-age=0')
  return res
}
