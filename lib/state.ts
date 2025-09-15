import fs from 'fs'
import path from 'path'
import { BlobNotFoundError, head, put } from '@vercel/blob'

export type Item = { id: string; name: string; imageUrl?: string | null }

export type State = {
  arenaTitle: string
  items: Item[]
  globalRatings: Record<string, number>
  perUserRatings: Record<string, Record<string, number>>
  wins: Record<string, number>
  appearances: Record<string, number>
  nameOverrides: Record<string, string>
  contributions: Record<string, number>
  allowedNames: string[]
  slotLimits: Record<string, number>
  extraSlots: Record<string, number>
  activeSessions: Record<string, { name: string; since: string }>
  signInEnabled: boolean
  activePairs: Record<string, [string, string]>
  deviceBuckets?: Record<string, string[]>
  deviceRecords?: Record<string, any>
  personalRatingsByDevice?: Record<string, Record<string, number>>
  currentPairByDevice?: Record<string, [string, string]>
  serverSessions?: Record<string, any>
}

// Local file paths used during development
export const dataPath = path.join(process.cwd(), 'app', 'data', 'state.json')
export const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

function ensureDirs() {
  if (!fs.existsSync(path.dirname(dataPath))) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true })
  }
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
}

export function defaultState(): State {
  return {
    arenaTitle: 'Arena',
    items: [],
    globalRatings: {},
    perUserRatings: {},
    wins: {},
    appearances: {},
    nameOverrides: {},
    contributions: {},
    allowedNames: [],
    slotLimits: {},
    extraSlots: {},
    activeSessions: {},
    signInEnabled: false,
    activePairs: {},
    deviceBuckets: {},
    deviceRecords: {},
    personalRatingsByDevice: {},
    currentPairByDevice: {},
    serverSessions: {},
  }
}

let cachedState: State | null = null
let cachedUploadedAt: string | null = null
const blobToken = process.env.BLOB_READ_WRITE_TOKEN
const useBlob = !!blobToken

export async function readState(): Promise<State> {
  if (useBlob) {
    try {
      const meta = await head('state.json', { token: blobToken })
      const uploadedAt = meta.uploadedAt.toISOString()
      if (cachedState && cachedUploadedAt === uploadedAt) {
        return cachedState
      }

      const res = await fetch(meta.downloadUrl || meta.url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to fetch state blob: ${res.status}`)
      const text = await res.text()
      cachedState = JSON.parse(text) as State
      cachedUploadedAt = uploadedAt
      return cachedState
    } catch (err) {
      if (err instanceof BlobNotFoundError || (err as any)?.name === 'BlobNotFoundError') {
        const fresh = defaultState()
        cachedState = fresh
        cachedUploadedAt = null
        return fresh
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to read arena state from blob, using cached/default state', err)
      }
      if (cachedState) return cachedState
      const fallback = defaultState()
      cachedState = fallback
      cachedUploadedAt = null
      return fallback
    }
  }

  if (cachedState) return cachedState
  ensureDirs()
  if (!fs.existsSync(dataPath)) {
    const s = defaultState()
    fs.writeFileSync(dataPath, JSON.stringify(s, null, 2))
    cachedState = s
    return s
  }
  cachedState = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as State
  return cachedState
}

export async function writeState(s: State): Promise<void> {
  cachedState = s
  if (useBlob) {
    await put('state.json', JSON.stringify(s), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    })
    try {
      const meta = await head('state.json', { token: blobToken })
      cachedUploadedAt = meta.uploadedAt.toISOString()
    } catch (err) {
      cachedUploadedAt = null
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to refresh arena state metadata after blob write', err)
      }
    }
    return
  }
  ensureDirs()
  fs.writeFileSync(dataPath, JSON.stringify(s, null, 2))
}

export function kFactor() {
  return 32
}

export function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400))
}

export function ensureItemStats(s: State, id: string) {
  if (!s.globalRatings[id]) s.globalRatings[id] = 1500
  if (!s.wins[id]) s.wins[id] = 0
  if (!s.appearances[id]) s.appearances[id] = 0
}

export function sanitizeItem(s: State, it: Item) {
  const name = s.nameOverrides[it.id] || it.name
  return { id: it.id, name, imageUrl: it.imageUrl || null }
}

export async function ensurePair(
  s: State,
  fp: string | undefined,
): Promise<[string, string] | null> {
  const ids = s.items.map((x) => x.id)
  if (!fp || ids.length < 2) return null
  let p = s.activePairs[fp]
  if (
    !p ||
    !ids.includes(p[0]) ||
    !ids.includes(p[1]) ||
    p[0] === p[1]
  ) {
    const a = ids[Math.floor(Math.random() * ids.length)]
    let b = ids[Math.floor(Math.random() * ids.length)]
    while (b === a) b = ids[Math.floor(Math.random() * ids.length)]
    p = [a, b]
    s.activePairs[fp] = p
    await writeState(s)
  }
  return p
}

