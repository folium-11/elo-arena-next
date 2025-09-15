import { NextRequest } from 'next/server'
import { json, requireRoles } from '@/lib/auth'
import { readState, writeState } from '@/lib/state'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const g = await requireRoles(req, ['admin', 'super_admin'])
  if ('error' in g) return g.error
  const s = await readState()
  let name = ''
  let extra = 0
  try {
    const b = await req.json()
    name = String(b?.name || '').trim()
    extra = Math.max(0, Math.floor(Number(b?.extra || 0)))
  } catch {
    return json('bad_payload', { status: 400 })
  }
  if (!name) return json('bad_name', { status: 400 })
  s.extraSlots = s.extraSlots || {}
  s.extraSlots[name] = extra
  await writeState(s)
  return json({ ok: true, name, extra })
}


