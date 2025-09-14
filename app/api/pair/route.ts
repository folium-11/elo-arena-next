import { NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

function pickPair(items: any[]) {
  if (items.length < 2) return null
  let i = Math.floor(Math.random() * items.length)
  let j = Math.floor(Math.random() * items.length)
  if (i === j) j = (j + 1) % items.length
  return [items[i], items[j]]
}

export async function GET() {
  const s = readState()
  const did = cookies().get('did')?.value || null
  const items = s.items || []
  if (items.length < 2) return NextResponse.json({ pair: null })

  const byId = new Map(items.map((x: any) => [x.id, x]))
  s.currentPairByDevice = s.currentPairByDevice || {}

  let pairIds = did ? s.currentPairByDevice[did] : undefined
  let pair: any = null

  if (pairIds && byId.has(pairIds[0]) && byId.has(pairIds[1]) && pairIds[0] !== pairIds[1]) {
    pair = [byId.get(pairIds[0]), byId.get(pairIds[1])]
  } else {
    const picked = pickPair(items)
    if (!picked) return NextResponse.json({ pair: null })
    pair = picked
    if (did) {
      s.currentPairByDevice[did] = [picked[0].id, picked[1].id]
      writeState(s)
    }
  }

  return NextResponse.json({ pair })
}
