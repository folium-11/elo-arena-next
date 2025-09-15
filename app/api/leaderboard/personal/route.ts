import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readState } from '@/lib/state'
import { buildPersonalLeaderboard } from '@/lib/arena'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  const enabled = !!s.signInEnabled
  const did = cookies().get('did')?.value || undefined

  if (!enabled) return NextResponse.json({ enabled: false })

  if (!did) return NextResponse.json({ enabled: true, signedIn: false, rows: [] })
  const personal = buildPersonalLeaderboard(s, did)
  if (!personal.signedIn) return NextResponse.json({ enabled: true, signedIn: false, rows: [] })

  const res = NextResponse.json({
    enabled: true,
    signedIn: true,
    name: personal.name,
    rows: personal.rows,
  })
  if (process.env.NODE_ENV !== 'production') res.headers.set('x-debug', 'personal_ok')
  return res
}
