import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readState, writeState } from '@/lib/state'
import { ensureDevicePair } from '@/lib/arena'

export const runtime = 'nodejs'

export async function GET() {
  const s = await readState()
  const did = cookies().get('did')?.value || null
  const { pair, mutated } = ensureDevicePair(s, did)
  if (mutated) await writeState(s)
  return NextResponse.json({ pair })
}
