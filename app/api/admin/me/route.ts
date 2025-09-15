import { getCurrentUser } from '@/lib/jwt-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { role } = await getCurrentUser()
  return Response.json({ role })
}
