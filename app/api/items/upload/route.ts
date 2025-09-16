import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/jwt-auth'
import { readState, writeState, uploadsDir } from '@/lib/state'
import path from 'path'
import crypto from 'crypto'
import { put } from '@vercel/blob'
import { promises as fsp } from 'fs'

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

  if (!useBlob) await fsp.mkdir(uploadsDir, { recursive: true })

  const additions = await Promise.all(
    files.map(async (f) => {
      const id = 'img-' + crypto.randomUUID()
      const originalName = (f.name || 'image').trim()
      let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!ext) ext = 'png'

      const buffer = Buffer.from(await f.arrayBuffer())

      const mimeType = f.type?.trim() || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
      const imageData = !useBlob
        ? `data:${mimeType};base64,${buffer.toString('base64')}`
        : null

      let url: string
      if (useBlob) {
        const { url: blobUrl } = await put(`uploads/${id}.${ext}`, buffer, {
          access: 'public',
          contentType: f.type || 'application/octet-stream',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        url = blobUrl
      } else {
        const filePath = path.join(uploadsDir, `${id}.${ext}`)
        await fsp.writeFile(filePath, buffer)
        url = `/uploads/${id}.${ext}`
      }

      let base = originalName.replace(/\.[^/.]+$/, '').trim()
      if (!base) base = originalName
      if (base.length > 120) base = base.slice(0, 120)

      return { id, name: base, imageUrl: url, imageData }
    }),
  )

  for (const item of additions) {
    s.items.push(item)
    if (!s.globalRatings[item.id]) s.globalRatings[item.id] = 1500
    s.wins[item.id] = 0
    s.appearances[item.id] = 0
  }

  await writeState(s)
  return NextResponse.json({ ok: true })
}
