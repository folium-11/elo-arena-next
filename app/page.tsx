'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Card from '@/components/Card'
import { Section } from '@/components/Section'

type Item = { id: string; name: string; imageUrl?: string | null; imageData?: string | null }
type Pair = [Item, Item]
type PersonalMode = 'anon' | 'signedIn' | 'signedOut'
type GlobalRow = { rank: number; id: string; name: string; rating: number; w: number; l: number; wp: number }
type PersonalRow = { rank: number; id: string; name: string; rating: number }
type HomePayload = {
  title: string
  items: Item[]
  itemsCount: number
  pair: Pair | null
  globalRows: GlobalRow[]
  personalMode: PersonalMode
  personalRows: PersonalRow[]
  signInEnabled: boolean
  signedIn: boolean
  myName: string
}

const K = 32
function expected(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)) }
function updateLocalPersonal(winnerId: string, loserId: string) {
  const raw = localStorage.getItem('personalRatings') || '{}'
  const map: Record<string, number> = JSON.parse(raw)
  if (map[winnerId] == null) map[winnerId] = 1500
  if (map[loserId] == null) map[loserId] = 1500
  const wa = map[winnerId], lb = map[loserId]
  const ea = expected(wa, lb), eb = expected(lb, wa)
  map[winnerId] = Math.round(wa + K * (1 - ea))
  map[loserId] = Math.round(lb + K * (0 - eb))
  localStorage.setItem('personalRatings', JSON.stringify(map))
}

function buildLocalPersonalRows(items: Item[]): PersonalRow[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem('personalRatings') || '{}'
  const map: Record<string, number> = JSON.parse(raw)
  const nameById = new Map(items.map((it) => [it.id, it.name]))
  let trimmed = false
  for (const id of Object.keys(map)) {
    if (!nameById.has(id)) {
      delete map[id]
      trimmed = true
    }
  }
  if (trimmed) localStorage.setItem('personalRatings', JSON.stringify(map))
  return Object.entries(map)
    .map(([id, rating]) => {
      const name = nameById.get(id)
      if (!name) return null
      return { id, name, rating: Number(rating) }
    })
    .filter((row): row is { id: string; name: string; rating: number } => !!row)
    .sort((a, b) => b.rating - a.rating)
    .map((row, index) => ({ rank: index + 1, ...row }))
}

function normalizeHomePayload(data: any): HomePayload {
  const items: Item[] = Array.isArray(data?.items)
    ? data.items
        .map((it: any) => ({
          id: String(it?.id || ''),
          name: String(it?.name || ''),
          imageUrl: typeof it?.imageUrl === 'string' ? it.imageUrl : null,
          imageData: typeof it?.imageData === 'string' ? it.imageData : null,
        }))
        .filter((it: Item) => it.id && it.name)
    : []

  let pair: Pair | null = null
  if (Array.isArray(data?.pair) && data.pair.length === 2) {
    const first = data.pair[0]
    const second = data.pair[1]
    const a: Item = {
      id: String(first?.id || ''),
      name: String(first?.name || ''),
      imageUrl: typeof first?.imageUrl === 'string' ? first.imageUrl : null,
      imageData: typeof first?.imageData === 'string' ? first.imageData : null,
    }
    const b: Item = {
      id: String(second?.id || ''),
      name: String(second?.name || ''),
      imageUrl: typeof second?.imageUrl === 'string' ? second.imageUrl : null,
      imageData: typeof second?.imageData === 'string' ? second.imageData : null,
    }
    if (a.id && a.name && b.id && b.name) {
      pair = [a, b]
    }
  }

  const globalRows: GlobalRow[] = Array.isArray(data?.globalRows)
    ? data.globalRows
        .map((row: any, index: number): GlobalRow => ({
          rank: Number(row?.rank ?? index + 1),
          id: String(row?.id || ''),
          name: String(row?.name || ''),
          rating: Number(row?.rating ?? 0),
          w: Number(row?.w ?? 0),
          l: Number(row?.l ?? 0),
          wp: Number(row?.wp ?? 0),
        }))
        .filter((row: GlobalRow) => !!row.id && !!row.name)
    : []

  const signInEnabled = !!data?.signInEnabled
  const signedIn = !!data?.signedIn

  let personalMode: PersonalMode = 'anon'
  if (data?.personalMode === 'signedIn' || data?.personalMode === 'signedOut' || data?.personalMode === 'anon') {
    personalMode = data.personalMode
  } else if (signInEnabled) {
    personalMode = signedIn ? 'signedIn' : 'signedOut'
  }

  const personalRows: PersonalRow[] =
    personalMode === 'signedIn' && Array.isArray(data?.personalRows)
      ? data.personalRows
          .map((row: any, index: number): PersonalRow => ({
            rank: Number(row?.rank ?? index + 1),
            id: String(row?.id || ''),
            name: String(row?.name || ''),
            rating: Number(row?.rating ?? 0),
          }))
          .filter((row: PersonalRow) => !!row.id && !!row.name)
      : []

  return {
    title: typeof data?.title === 'string' && data.title.trim() ? data.title : 'Arena',
    items,
    itemsCount: typeof data?.itemsCount === 'number' ? data.itemsCount : items.length,
    pair,
    globalRows,
    personalMode,
    personalRows,
    signInEnabled,
    signedIn,
    myName: typeof data?.myName === 'string' ? data.myName : '',
  }
}

async function sha256Hex(str: string) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function canvasHash() {
  const c = document.createElement('canvas')
  c.width = 300; c.height = 120
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  ctx.textBaseline = 'top'
  ctx.font = `16px "Arial", "Helvetica", sans-serif`
  ctx.fillStyle = '#f60'
  ctx.fillRect(0, 0, 300, 40)
  ctx.fillStyle = '#069'
  ctx.fillText('fp::canvas::sample🙂✍️', 2, 2)
  ctx.strokeStyle = '#222'
  ctx.strokeRect(10, 50, 200, 60)
  try {
    const data = c.toDataURL()
    return await sha256Hex(data)
  } catch {
    return ''
  }
}

async function audioHash() {
  try {
    const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100, 44100)
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 440
    const comp = ctx.createDynamicsCompressor()
    osc.connect(comp)
    comp.connect(ctx.destination)
    osc.start(0); osc.stop(0.05)
    const buf = await ctx.startRendering()
    const data = buf.getChannelData(0)
    let acc = 0
    for (let i = 0; i < data.length; i += 64) acc += Math.round((data[i] + 1) * 1000)
    return await sha256Hex(String(acc))
  } catch {
    return ''
  }
}

async function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return { renderer: '', vendor: '' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as any
    const vendor = ext ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string) : ''
    const renderer = ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : (gl.getParameter(gl.RENDERER) as string)
    return { renderer: String(renderer || ''), vendor: String(vendor || '') }
  } catch {
    return { renderer: '', vendor: '' }
  }
}

async function collectFingerprint() {
  const ua = (navigator as any).userAgentData
    ? {
        brands: (navigator as any).userAgentData.brands || [],
        mobile: !!(navigator as any).userAgentData.mobile,
        platform: (navigator as any).userAgentData.platform || '',
      }
    : {
        brands: [],
        mobile: /mobile/i.test(navigator.userAgent),
        platform: navigator.platform || '',
      }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const lang = navigator.language || (navigator.languages && navigator.languages[0]) || ''

  const screenInfo = {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth || 24,
    dpr: Number(window.devicePixelRatio || 1),
  }

  const webgl = await getWebGLInfo()
  const canvas = { hash: await canvasHash() }
  const audio = { hash: await audioHash() }

  return { ua, tz, lang, screen: screenInfo, webgl, canvas, audio }
}

export default function Home() {
  const [title, setTitle] = useState('Arena')
  const [pair, setPair] = useState<Pair | null>(null)
  const [busy, setBusy] = useState(false)
  const [globalRows, setGlobalRows] = useState<GlobalRow[]>([])
  const [personalRows, setPersonalRows] = useState<PersonalRow[]>([])
  const [itemsCount, setItemsCount] = useState(0)

  const [signInEnabled, setSignInEnabled] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [myName, setMyName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [signInError, setSignInError] = useState<string | null>(null)
  const [personalMode, setPersonalMode] = useState<PersonalMode>('anon')

  const canVoteRef = useRef(false)
  const pairRef = useRef<Pair | null>(null)
  const busyRef = useRef(false)
  const itemsRef = useRef<Item[]>([])

  const canVote = (!signInEnabled || signedIn) && !!pair && !busy
  useEffect(() => {
    canVoteRef.current = (!signInEnabled || signedIn) && !!pair && !busy
  }, [signInEnabled, signedIn, pair, busy])
  useEffect(() => { pairRef.current = pair }, [pair])
  useEffect(() => { busyRef.current = busy }, [busy])

  const applyHomePayload = useCallback((payload: HomePayload) => {
    const incomingItems = Array.isArray(payload.items) ? payload.items : []
    const normalizedItems = incomingItems.length > 0 || payload.itemsCount === 0 ? incomingItems : itemsRef.current
    itemsRef.current = normalizedItems
    setTitle(payload.title || 'Arena')
    setItemsCount(typeof payload.itemsCount === 'number' ? payload.itemsCount : normalizedItems.length)
    setPair(payload.pair || null)
    setGlobalRows(Array.isArray(payload.globalRows) ? payload.globalRows : [])
    setSignInEnabled(!!payload.signInEnabled)
    setSignedIn(!!payload.signedIn)
    setMyName(payload.myName || '')
    setPersonalMode(payload.personalMode)
    if (payload.personalMode === 'signedIn') {
      setPersonalRows(Array.isArray(payload.personalRows) ? payload.personalRows : [])
    } else if (payload.personalMode === 'anon') {
      setPersonalRows(buildLocalPersonalRows(normalizedItems))
    } else {
      setPersonalRows([])
    }
  }, [])

  const refreshAll = useCallback(async () => {
    try {
      const res = await fetch('/api/home/', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to fetch home data: ${res.status}`)
      const data = await res.json()
      if (!data || typeof data !== 'object') throw new Error('Invalid home payload')
      applyHomePayload(normalizeHomePayload(data))
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to refresh arena data', err)
      }
    }
  }, [applyHomePayload])

  const doVote = useCallback(async (side: 'left' | 'right') => {
    const current = pairRef.current
    if (!current || busyRef.current || !canVoteRef.current) return
    busyRef.current = true
    setBusy(true)

    const winner = side === 'left' ? current[0] : current[1]
    const loser = side === 'left' ? current[1] : current[0]

    try {
      const res = await fetch('/api/vote/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ winnerId: winner.id, loserId: loser.id }),
      })
      if (res.status === 403) {
        await refreshAll()
        return
      }
      if (!res.ok) throw new Error(`Vote failed: ${res.status}`)
      if (!signInEnabled) updateLocalPersonal(winner.id, loser.id)
      const data = await res.json().catch(() => null)
      if (data && typeof data === 'object') {
        applyHomePayload(normalizeHomePayload(data))
      } else {
        await refreshAll()
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('Vote failed', err)
      await refreshAll()
    } finally {
      setBusy(false)
      busyRef.current = false
    }
  }, [applyHomePayload, refreshAll, signInEnabled])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = (el?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return
      if (!canVoteRef.current || !pairRef.current || busyRef.current) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'Left') { e.preventDefault(); doVote('left') }
      else if (k === 'ArrowRight' || k === 'Right') { e.preventDefault(); doVote('right') }
    }
    document.addEventListener('keydown', onKey, { passive: false })
    return () => document.removeEventListener('keydown', onKey)
  }, [doVote])

  useEffect(() => {
    let cancelled = false
    void refreshAll()
    ;(async () => {
      try {
        const sig = await collectFingerprint()
        if (cancelled) return
        await fetch('/api/device/identify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sig }),
        })
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [refreshAll])

  function renderItem(it: Item | null) {
    if (!it) return null
    return (
      <div className="flex flex-col items-center gap-4">
        {it.imageUrl || it.imageData ? (
          <img
            src={it.imageUrl || it.imageData || ''}
            alt={it.name}
            className="rounded-xl max-h-[320px]"
            onError={(e) => {
              if (it.imageData && e.currentTarget.src !== it.imageData) {
                e.currentTarget.onerror = null
                e.currentTarget.src = it.imageData
              }
            }}
          />
        ) : null}
        <div className="text-sm text-text">{it.name}</div>
      </div>
    )
  }

  const ShortcutHint = <span className="text-xs text-subtext">Tip: use ← / → to vote</span>

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

        {signInEnabled ? (
          signedIn ? (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-subtext">Signed in as <span className="text-text">{myName}</span></span>
              {ShortcutHint}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSignInError(null)
                const res = await fetch('/api/signin/login/', {
                  method: 'POST',
                  body: JSON.stringify({ name: nameInput }),
                })
                if (!res.ok) {
                  const t = (await res.text()).trim()
                  const msg =
                    t === 'not_allowed' ? 'Invalid name' :
                    t === 'name_full' ? 'All sign-in slots for this name are currently in use' :
                    t === 'device_missing' ? 'Please enable cookies' :
                    t.replace(/[_-]/g, ' ') || 'Sign-in failed'
                  setSignInError(msg)
                  return
                }
                setNameInput('')
                await refreshAll()
              }}
              className="flex items-center gap-2 text-xs"
            >
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                aria-label="Name"
                autoComplete="username"
                className="w-56 sm:w-64 md:w-72 lg:w-80 rounded-full border border-border bg-bg px-4 py-2"
              />
              <button className="rounded-full border border-border px-5 py-2 hover:border-primary">Sign In</button>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {signInError && <span className="text-warning">{signInError}</span>}
                {ShortcutHint}
              </div>
            </form>
          )
        ) : (
          ShortcutHint
        )}
      </div>

      {itemsCount < 2 ? (
        <Card>
          <div className="p-6 text-sm text-subtext">Add at least 2 items to start the arena.</div>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-6 px-6 py-8">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center md:h-[400px] w-full">
                {renderItem(pair ? pair[0] : null)}
              </div>
              <button
                disabled={!canVote}
                onClick={() => doVote('left')}
                aria-keyshortcuts="ArrowLeft,Left"
                className="rounded-full bg-primary text-text px-6 py-3 disabled:opacity-60"
              >
                {(!signInEnabled || signedIn) ? 'Choose Left (←)' : 'Sign in to vote'}
              </button>
            </div>
            <div className="flex items-center justify-center text-subtext text-sm md:px-4 md:h-[400px] text-center">vs</div>
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center md:h-[400px] w-full">
                {renderItem(pair ? pair[1] : null)}
              </div>
              <button
                disabled={!canVote}
                onClick={() => doVote('right')}
                aria-keyshortcuts="ArrowRight,Right"
                className="rounded-full bg-primary text-text px-6 py-3 disabled:opacity-60"
              >
                {(!signInEnabled || signedIn) ? 'Choose Right (→)' : 'Sign in to vote'}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Global Leaderboard">
          <Card>
            <div className="p-4">
              {globalRows.length < 2 ? (
                <div className="text-subtext text-sm">Leaderboard will appear once there are at least 2 items.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-subtext">
                    <tr className="text-left">
                      <th className="py-2">Rank</th>
                      <th>Name</th>
                      <th>Elo</th>
                      <th>W-L</th>
                      <th>Win%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {globalRows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2">{r.rank}</td>
                        <td className="truncate">{r.name}</td>
                        <td>{r.rating}</td>
                        <td>{r.w}-{r.l}</td>
                        <td>{r.wp}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </Section>

        <Section title="Personal Leaderboard">
          <Card>
            <div className="p-4">
              {itemsCount < 2 ? (
                <div className="text-subtext text-sm">Leaderboard will appear once there are at least 2 items.</div>
              ) : personalMode === 'signedOut' ? (
                <div className="text-subtext text-sm">Sign in to build your personal leaderboard.</div>
              ) : personalRows.length < 2 ? (
                <div className="text-subtext text-sm">Start voting to build your personal leaderboard.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-subtext">
                    <tr className="text-left">
                      <th className="py-2">Rank</th>
                      <th>Name</th>
                      <th>Elo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {personalRows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2">{r.rank}</td>
                        <td className="truncate">{r.name}</td>
                        <td>{r.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </Section>
      </div>
    </div>
  )
}
