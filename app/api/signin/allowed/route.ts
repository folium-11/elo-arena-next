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
  s.allowedNames = names
  await writeState(s)
  return json({ ok: true, count: names.length })
}


