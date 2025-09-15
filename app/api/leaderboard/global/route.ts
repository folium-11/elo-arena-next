import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'
import { buildGlobalLeaderboard } from '@/lib/arena'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  if (s.items.length < 2) {
    return NextResponse.json({ ready: false, rows: [] })
  }

  const rows = buildGlobalLeaderboard(s)
  return NextResponse.json({ ready: true, rows })
}

