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

  const isProd = process.env.NODE_ENV === 'production'
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  let blobFailed = false
  const shouldUseBlob = () => (blobToken || isProd) && !blobFailed

  const s = await readState()

  try {
    const form = await req.formData()
    const files = form.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const additions = await Promise.all(
      files.map(async (f) => {
        const id = 'img-' + crypto.randomUUID()
        const originalName = (f.name || 'image').trim()
        let ext = (originalName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!ext) ext = 'png'

        const buffer = Buffer.from(await f.arrayBuffer())

        let url: string | null = null
        if (shouldUseBlob()) {
          try {
            const { url: blobUrl } = await put(`uploads/${id}.${ext}`, buffer, {
              access: 'public',
              contentType: f.type || 'application/octet-stream',
              ...(blobToken ? { token: blobToken } : {}),
            })
            url = blobUrl
          } catch (err) {
            blobFailed = true
            if (!blobToken && isProd) {
              throw new Error('Persistent storage requires the BLOB_READ_WRITE_TOKEN environment variable in production.')
            }
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Falling back to local uploads directory after blob upload failure.', err)
            }
          }
        }

        if (!url) {
          try {
            await fsp.mkdir(uploadsDir, { recursive: true })
          } catch (err) {
            throw new Error('Failed to prepare local uploads directory. Ensure the server can write to disk or configure BLOB storage.')
          }
          try {
            const filePath = path.join(uploadsDir, `${id}.${ext}`)
            await fsp.writeFile(filePath, buffer)
            url = `/uploads/${id}.${ext}`
          } catch (err) {
            throw new Error('Failed to persist uploaded file to local storage. Configure BLOB_READ_WRITE_TOKEN for durable uploads.')
          }
        }

        let base = originalName.replace(/\.[^/.]+$/, '').trim()
        if (!base) base = originalName
        if (base.length > 120) base = base.slice(0, 120)

        return { id, name: base, imageUrl: url }
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
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to upload arena items', err)
    }
    const message = err instanceof Error && err.message ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
