import { NextRequest } from 'next/server'
import { json, requireRoles } from '@/lib/auth'
import { readState, writeState } from '@/lib/state'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const g = await requireRoles(req, ['admin', 'super_admin'])
  if ('error' in g) return g.error
  const s = await readState()
  let names: string[] = []
  try {
    const b = await req.json()
    const arr = Array.isArray(b?.names) ? b.names : []
    names = arr.map((x: any) => String(x || '').trim()).filter(Boolean)
  } catch {
    return json('bad_payload', { status: 400 })
  }
  if (!names.length) return json({ ok: true, cleared: 0 })

  const before = Object.keys(s.activeSessions || {}).length
  const keep: Record<string, { name: string; since: string }> = {}
  Object.entries(s.activeSessions || {}).forEach(([id, v]: any) => {
    const n = String(v?.name || '')
    if (!n || names.includes(n)) return
    keep[id] = v
  })
  s.activeSessions = keep
  await writeState(s)
  const after = Object.keys(s.activeSessions || {}).length
  return json({ ok: true, cleared: Math.max(0, before - after) })
}


