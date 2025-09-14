import { NextResponse } from 'next/server'
import { readState } from '@/lib/state'

export const runtime = 'nodejs'

export async function GET() {
  const s = readState()
  const overrides = s.nameOverrides || {}

  // Apply overrides when present so older data stays consistent
  const items = (s.items || []).map((it: any) => {
    const o = String(overrides[it.id] ?? '').trim()
    return o ? { ...it, name: o } : it
  })

  return NextResponse.json({
    ...s,
    items,
  })
}
