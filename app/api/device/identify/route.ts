import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readState, writeState } from '@/lib/state'
import { deriveIds, similarity } from '@/lib/deviceid'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const sig = body?.sig
  if (!sig) return new NextResponse('bad_payload', { status: 400 })

  const { bucketId, deviceId } = deriveIds(sig)

  const s = readState()
  s.deviceBuckets = s.deviceBuckets || {}               // bucketId -> deviceId[]
  s.deviceRecords = s.deviceRecords || {}               // deviceId -> record{ sig, ... }

  let chosen = deviceId

  // Try soft match within bucket
  const list: string[] = s.deviceBuckets[bucketId] || []
  let best = { id: '', score: -1 }
  for (const id of list) {
    const rec = s.deviceRecords[id]
    if (!rec?.sig) continue
    const sc = similarity(sig, rec.sig)
    if (sc > best.score) best = { id, score: sc }
  }

  // Threshold: 3.0 (tune as needed)
  if (best.id && best.score >= 3.0) {
    chosen = best.id
    // Optionally refresh stored sig with latest minor details
    const rec = s.deviceRecords[chosen]
    rec.lastSeen = new Date().toISOString()
    rec.usageCount = (rec.usageCount || 0) + 1
    rec.sig = { ...rec.sig, ...sig }
    s.deviceRecords[chosen] = rec
  } else {
    // New device record
    const rec = {
      deviceId,
      bucketId,
      sig,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      usageCount: 1,
    }
    s.deviceRecords[deviceId] = rec
    s.deviceBuckets[bucketId] = Array.from(new Set([...(s.deviceBuckets[bucketId] || []), deviceId]))
  }

  writeState(s)

  // Set long-lived, HttpOnly cookie
  const secure = process.env.NODE_ENV !== 'development'
  cookies().set('did', chosen, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  return NextResponse.json({ device_id: chosen })
}
