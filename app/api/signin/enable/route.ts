import { NextRequest } from 'next/server'
import { json, requireRoles } from '@/lib/auth'
import { readState, writeState } from '@/lib/state'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const g = requireRoles(req, ['admin', 'super_admin'])
  if ('error' in g) return g.error
  const s = readState()
  let enabled = false
  try {
    const b = await req.json()
    enabled = !!b?.enabled
  } catch {
    return json('bad_payload', { status: 400 })
  }
  s.signInEnabled = !!enabled
  writeState(s)
  return json({ ok: true, enabled: s.signInEnabled })
}


