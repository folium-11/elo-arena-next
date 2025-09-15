import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  const enabled = !!s.signInEnabled
  const did = cookies().get('did')?.value || null

  if (!enabled) return NextResponse.json({ enabled: false, signedIn: false })

  const session = did ? s.activeSessions?.[did] : undefined
  if (session?.name) {
    return NextResponse.json({ enabled: true, signedIn: true, name: session.name })
  }
  return NextResponse.json({ enabled: true, signedIn: false })
}
