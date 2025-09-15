import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  const enabled = !!s.signInEnabled
  const did = cookies().get('did')?.value || undefined

  if (!enabled) return NextResponse.json({ enabled: false })

  if (!did) return NextResponse.json({ enabled: true, signedIn: false, rows: [] })
  const session = s.activeSessions?.[did]
  if (!session?.name) return NextResponse.json({ enabled: true, signedIn: false, rows: [] })

  const map: Record<string, number> = (s.personalRatingsByDevice?.[did] as any) || {}
  const items = s.items || []
  const nameById = new Map(items.map((it: any) => [it.id, it.name]))

  const rows = Object.entries(map)
    .map(([id, rating]) => ({ id, rating: Number(rating), name: nameById.get(id) }))
    .filter(r => r.name)
    .sort((a, b) => b.rating - a.rating)
    .map((r, i) => ({ rank: i + 1, ...r }))

  const res = NextResponse.json({ enabled: true, signedIn: true, name: session.name, rows })
  if (process.env.NODE_ENV !== 'production') res.headers.set('x-debug', 'personal_ok')
  return res
}
