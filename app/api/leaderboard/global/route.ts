import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  if (s.items.length < 2) {
    return NextResponse.json({ ready: false, rows: [] })
  }

  const rows = s.items
    .map((it) => {
      const id = it.id
      const rating = s.globalRatings[id] || 1500
      const w = s.wins[id] || 0
      const a = s.appearances[id] || 0
      const l = a - w
      const wp = a > 0 ? Math.round((w / a) * 100) : 0
      return { id, name: s.nameOverrides[id] || it.name, rating, w, l, wp }
    })
    .sort((x, y) => y.rating - x.rating)
    .map((row, i) => ({ rank: i + 1, ...row }))

  return NextResponse.json({ ready: true, rows })
}

