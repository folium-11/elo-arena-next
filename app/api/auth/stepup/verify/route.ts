import { NextRequest } from 'next/server'
import { currentSession, json, markStepUpNow } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { session } = currentSession()
  if (!session) return json('unauthorized', { status: 401 })

  let password = ''
  try {
    const b = await req.json()
    password = String(b?.password || '')
  } catch {
    return json('bad_payload', { status: 400 })
  }

  // Verify against the highest privilege in this session
  const isSuper = session.roles.includes('super_admin')
  const must = isSuper ? (process.env.SUPER_ADMIN_PASSWORD || '') : (process.env.ADMIN_PASSWORD || '')
  if (!must || password !== must) return json('invalid_credentials', { status: 401 })

  markStepUpNow(session)
  return json({ ok: true })
}
