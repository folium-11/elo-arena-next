import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState } from '@/lib/state'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = readState()
  const c = cookies()
  const role = c.get('role')?.value
  const fp = c.get('fp')?.value
  const isOjHolder = !!(s.ojLock?.holder && fp && s.ojLock.holder === fp)

  // Permit admin, super_admin, or current OJ holder
  if (!(role === 'admin' || role === 'super_admin' || isOjHolder)) {
    return new NextResponse('forbidden', { status: 403 })
  }

  let id = ''
  let name = ''
  const ct = req.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      const body = await req.json()
      id = String(body?.id ?? '').trim()
      name = String(body?.name ?? '').trim()
    } else {
      const raw = (await req.text()).trim()
      try {
        const body = JSON.parse(raw)
        id = String(body?.id ?? '').trim()
        name = String(body?.name ?? '').trim()
      } catch {
        const mId = raw.match(/id=([^\n\r]+)/)
        const mName = raw.match(/name=([^\n\r]+)/)
        id = String(mId?.[1] ?? '').trim()
        name = String(mName?.[1] ?? '').trim()
      }
    }
  } catch {
    return new NextResponse('bad payload', { status: 400 })
  }

  if (!id) return new NextResponse('bad id', { status: 400 })
  if (!name) return new NextResponse('bad name', { status: 400 })
  if (name.length > 120) name = name.slice(0, 120)

  const it = s.items.find((x: any) => x.id === id)
  if (!it) return new NextResponse('not found', { status: 404 })

  // Persist directly on the item (and mirror to overrides for legacy readers)
  it.name = name
  s.nameOverrides = s.nameOverrides || {}
  s.nameOverrides[id] = name

  writeState(s)
  return NextResponse.json({ ok: true, id, name })
}
