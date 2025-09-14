import { NextRequest, NextResponse } from 'next/server'
import { readState, writeState, uploadsDir } from '@/lib/state'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = readState()
  const role = cookies().get('role')?.value
  if (!(role === 'admin' || role === 'super_admin')) {
    return new NextResponse('forbidden', { status: 403 })
  }

  const form = await req.formData()
  const files = form.getAll('files') as File[]

  // Ensure uploads directory exists
  fs.mkdirSync(uploadsDir, { recursive: true })

  for (const f of files) {
    const id = 'img-' + crypto.randomUUID()

    // Save the file with its original extension
    const originalName = (f.name || 'image').trim()
    let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!ext) ext = 'png'
    const filePath = path.join(uploadsDir, `${id}.${ext}`)

    // Write bytes using Uint8Array to satisfy fs typings
    const arrayBuffer = await f.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    fs.writeFileSync(filePath, bytes)

    // Use the base name (no extension) as the item display name
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
  return NextResponse.json({ ok: true })
}
