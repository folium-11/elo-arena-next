import path from 'path'
import { promises as fsp } from 'fs'
import { BlobNotFoundError, head, put } from '@vercel/blob'

export type Item = { id: string; name: string; imageUrl?: string | null; imageData?: string | null }

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

const warnedMessages = new Set<string>()

function warnOnce(msg: string, err: unknown) {
  if (warnedMessages.has(msg)) return
  warnedMessages.add(msg)
  if (process.env.NODE_ENV !== 'production') {
    console.warn(msg, err)
  }
}

async function ensureDirs() {
  try {
    await fsp.mkdir(path.dirname(dataPath), { recursive: true })
  } catch (err) {
    warnOnce('Failed to ensure data directory, falling back to in-memory state only.', err)
  }
  try {
    await fsp.mkdir(uploadsDir, { recursive: true })
  } catch (err) {
    warnOnce('Failed to ensure uploads directory, falling back to in-memory state only.', err)
  }
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
const BLOB_CACHE_MS = 2000
let readPromise: Promise<State> | null = null
let lastBlobCheck = 0

export async function readState(): Promise<State> {
  if (useBlob) {
    if (cachedState && Date.now() - lastBlobCheck < BLOB_CACHE_MS) {
      return cachedState
    }
    if (readPromise) return readPromise
    readPromise = (async () => {
      try {
        const meta = await head('state.json', { token: blobToken })
        const uploadedAt = meta.uploadedAt.toISOString()
        if (cachedState && cachedUploadedAt === uploadedAt) {
          lastBlobCheck = Date.now()
          return cachedState
        }

        const res = await fetch(meta.downloadUrl || meta.url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to fetch state blob: ${res.status}`)
        const text = await res.text()
        cachedState = JSON.parse(text) as State
        cachedUploadedAt = uploadedAt
        lastBlobCheck = Date.now()
        return cachedState
      } catch (err) {
        if (err instanceof BlobNotFoundError || (err as any)?.name === 'BlobNotFoundError') {
          const fresh = defaultState()
          cachedState = fresh
          cachedUploadedAt = null
          lastBlobCheck = Date.now()
          return fresh
        }
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to read arena state from blob, using cached/default state', err)
        }
        if (cachedState) {
          lastBlobCheck = Date.now()
          return cachedState
        }
        const fallback = defaultState()
        cachedState = fallback
        cachedUploadedAt = null
        lastBlobCheck = Date.now()
        return fallback
      } finally {
        readPromise = null
      }
    })()
    return readPromise
  }

  if (cachedState) return cachedState
  if (readPromise) return readPromise

  readPromise = (async () => {
    try {
      await ensureDirs()
      const text = await fsp.readFile(dataPath, 'utf-8')
      cachedState = JSON.parse(text) as State
      return cachedState
    } catch (err: any) {
      if (err && err.code === 'ENOENT') {
        const s = defaultState()
        cachedState = s
        try {
          await fsp.writeFile(dataPath, JSON.stringify(s, null, 2))
        } catch (writeErr) {
          warnOnce('Failed to write arena state file, state will be kept in memory only.', writeErr)
        }
        return s
      }
      warnOnce('Failed to read arena state file, using in-memory cache instead.', err)
      if (cachedState) return cachedState
      const fallback = defaultState()
      cachedState = fallback
      return fallback
    } finally {
      readPromise = null
    }
  })()
  return readPromise
}

export async function writeState(s: State): Promise<void> {
  cachedState = s
  if (useBlob) {
    lastBlobCheck = Date.now()
    await put('state.json', JSON.stringify(s), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    })
    cachedUploadedAt = new Date().toISOString()
    return
  }
  await ensureDirs()
  try {
    await fsp.writeFile(dataPath, JSON.stringify(s, null, 2))
  } catch (err) {
    warnOnce('Failed to persist arena state to disk, continuing with in-memory state.', err)
  }
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
  return {
    id: it.id,
    name,
    imageUrl: it.imageUrl || null,
    imageData: it.imageData || null,
  }
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

