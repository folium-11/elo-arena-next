import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/jwt-auth'
import { readState, writeState } from '@/lib/state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const { role, error } = await getCurrentUser()
  if (error) return error
  if (role === 'none') return new NextResponse('unauthorized', { status: 401 })
  
  const s = readState()
  let title = ''
  try { title = String((await req.json())?.title || '').trim() } catch { return new NextResponse('bad_payload', { status: 400 }) }
  s.arenaTitle = title || 'Arena'
  writeState(s)
  return Response.json({ ok: true })
}
