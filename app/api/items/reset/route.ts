import { NextRequest } from 'next/server'
import { json, requireRoles } from '@/lib/auth'
import { writeState, readState } from '@/lib/state'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const g = requireRoles(req, ['admin', 'super_admin'])
  if ('error' in g) return g.error
  const s = readState()
  let id = ''
  try { id = String((await req.json())?.id || '').trim() } catch { return json('bad_payload', { status: 400 }) }
  if (!id) return json('bad_input', { status: 400 })

  // Reset ratings and stats for the item
  s.globalRatings[id] = 1500
  s.wins[id] = 0
  s.appearances[id] = 0
  writeState(s)
  return json({ ok: true })
}
