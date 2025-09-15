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

  let name = ''
  try {
    name = String((await req.json())?.name || '').trim()
  } catch {
    return new NextResponse('bad_payload', { status: 400 })
  }
  if (!name) return new NextResponse('bad_input', { status: 400 })
  if (name.length > 120) name = name.slice(0, 120)

  const id = 'txt-' + crypto.randomUUID()
  s.items.push({ id, name })
  if (!s.globalRatings[id]) s.globalRatings[id] = 1500
  s.wins[id] = 0
  s.appearances[id] = 0
  await writeState(s)
  return Response.json({ ok: true, id, name })
}
