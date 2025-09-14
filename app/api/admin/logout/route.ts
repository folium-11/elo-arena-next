import { destroySession, json } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  destroySession()
  return json({ ok: true })
}
