import { json, currentSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const { s, session } = currentSession()
  if (!session) return json({ role: 'none' as const })
  const role = session.roles.includes('super_admin') ? 'super_admin' : 'admin'
  return json({ role, csrfToken: session.csrfSecret })
}
