import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/jwt-auth'
import { readState, writeState } from '@/lib/state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const { role, error } = await getCurrentUser()
  if (error) return error
  if (role === 'none') return new NextResponse('unauthorized', { status: 401 })

  const s = await readState()

  let id = ''
  let name = ''
  try {
    const b = await req.json()
    id = String(b?.id || '').trim()
    name = String(b?.name || '').trim()
  } catch {
    return new NextResponse('bad_payload', { status: 400 })
  }
  if (!id || !name) return new NextResponse('bad_input', { status: 400 })
  if (name.length > 120) name = name.slice(0, 120)

  const it = (s.items || []).find((x: any) => x.id === id)
  if (!it) return new NextResponse('not_found', { status: 404 })
  it.name = name
  s.nameOverrides = s.nameOverrides || {}
  s.nameOverrides[id] = name
  await writeState(s)
  return Response.json({ ok: true, id, name })
}
