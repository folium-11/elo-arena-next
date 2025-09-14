import { NextRequest } from 'next/server'
import { json, requireRoles } from '@/lib/auth'
import { readState, writeState, uploadsDir } from '@/lib/state'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const g = requireRoles(req, ['admin', 'super_admin'])
  if ('error' in g) return g.error
  const s = readState()

  const form = await req.formData()
  const files = form.getAll('files') as File[]
  fs.mkdirSync(uploadsDir, { recursive: true })

  for (const f of files) {
    const id = 'img-' + crypto.randomUUID()
    const originalName = (f.name || 'image').trim()
    let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!ext) ext = 'png'

    const filePath = path.join(uploadsDir, `${id}.${ext}`)
    const buf = new Uint8Array(await f.arrayBuffer())
    fs.writeFileSync(filePath, buf)

    let base = originalName.replace(/\.[^/.]+$/, '').trim()
    if (!base) base = originalName
    if (base.length > 120) base = base.slice(0, 120)

    const url = `/uploads/${id}.${ext}`
    s.items.push({ id, name: base, imageUrl: url })
    if (!s.globalRatings[id]) s.globalRatings[id] = 1500
    s.wins[id] = 0
    s.appearances[id] = 0
  }

  writeState(s)
  return json({ ok: true })
}
