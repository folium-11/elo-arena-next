import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/jwt-auth'
import { writeState, readState } from '@/lib/state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const { role, error } = await getCurrentUser()
  if (error) return error
  if (role === 'none') return new NextResponse('unauthorized', { status: 401 })
  
  const s = readState()

  let id = ''
  try {
    id = String((await req.json())?.id || '').trim()
  } catch {
    return new NextResponse('bad_payload', { status: 400 })
  }
  if (!id) return new NextResponse('bad_input', { status: 400 })

  s.items = (s.items || []).filter((x: any) => x.id !== id)
  delete s.globalRatings[id]
  delete s.wins[id]
  delete s.appearances[id]
  delete s.nameOverrides?.[id]
  // prune pairs etc. if present
  writeState(s)
  return Response.json({ ok: true })
}
