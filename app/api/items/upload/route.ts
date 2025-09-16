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
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  const useBlob = !!blobToken

  if (!useBlob) await fsp.mkdir(uploadsDir, { recursive: true })

  const additions = await Promise.all(
    files.map(async (f) => {
      const id = 'img-' + crypto.randomUUID()
      const originalName = (f.name || 'image').trim()
      let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!ext) ext = 'png'

      const buffer = Buffer.from(await f.arrayBuffer())

      const mimeType = (() => {
        const explicit = String(f.type || '').trim().toLowerCase()
        if (explicit) return explicit
        switch (ext) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg'
          case 'png':
            return 'image/png'
          case 'gif':
            return 'image/gif'
          case 'webp':
            return 'image/webp'
          case 'svg':
            return 'image/svg+xml'
          case 'bmp':
            return 'image/bmp'
          case 'avif':
            return 'image/avif'
          default:
            return 'application/octet-stream'
        }
      })()

      let url: string
      let imageData: string | null = null
      if (useBlob) {
        const { url: blobUrl } = await put(`uploads/${id}.${ext}`, buffer, {
          access: 'public',
          contentType: mimeType,
          token: blobToken,
        })
        url = blobUrl
      } else {
        const filePath = path.join(uploadsDir, `${id}.${ext}`)
        await fsp.writeFile(filePath, buffer)
        url = `/uploads/${id}.${ext}`
        const base64 = buffer.toString('base64')
        imageData = `data:${mimeType};base64,${base64}`
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
