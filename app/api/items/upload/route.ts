import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/jwt-auth'
import { readState, writeState, uploadsDir } from '@/lib/state'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const { role, error } = await getCurrentUser()
  if (error) return error
  if (role === 'none') return new NextResponse('unauthorized', { status: 401 })
  
  const s = await readState()

  const form = await req.formData()
  const files = form.getAll('files') as File[]
  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

  if (!useBlob) fs.mkdirSync(uploadsDir, { recursive: true })

  for (const f of files) {
    const id = 'img-' + crypto.randomUUID()
    const originalName = (f.name || 'image').trim()
    let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!ext) ext = 'png'

    const buf = Buffer.from(await f.arrayBuffer())

    let url: string
    if (useBlob) {
      const { url: blobUrl } = await put(`uploads/${id}.${ext}`, buf, {
        access: 'public',
        contentType: f.type || 'application/octet-stream',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      url = blobUrl
    } else {
      const filePath = path.join(uploadsDir, `${id}.${ext}`)
      fs.writeFileSync(filePath, buf)
      url = `/uploads/${id}.${ext}`
    }

    let base = originalName.replace(/\.[^/.]+$/, '').trim()
    if (!base) base = originalName
    if (base.length > 120) base = base.slice(0, 120)

    s.items.push({ id, name: base, imageUrl: url })
    if (!s.globalRatings[id]) s.globalRatings[id] = 1500
    s.wins[id] = 0
    s.appearances[id] = 0
  }

  await writeState(s)
  return NextResponse.json({ ok: true })
}
