'use client'

import { useEffect, useRef, useState } from 'react'
import Card from '@/components/Card'
import { Section } from '@/components/Section'

type Item = { id: string; name: string; imageUrl?: string | null }
type Pair = [Item, Item]
type PersonalMode = 'anon' | 'signedIn' | 'signedOut'

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
  const [globalRows, setGlobalRows] = useState<any[]>([])
  const [personalRows, setPersonalRows] = useState<any[]>([])
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

  const canVote = (!signInEnabled || signedIn) && !!pair && !busy
  useEffect(() => {
    canVoteRef.current = (!signInEnabled || signedIn) && !!pair && !busy
  }, [signInEnabled, signedIn, pair, busy])
  useEffect(() => { pairRef.current = pair }, [pair])
  useEffect(() => { busyRef.current = busy }, [busy])

  async function refreshSignIn() {
    const s = await fetch('/api/signin/status/', { cache: 'no-store' }).then(r => r.json())
    setSignInEnabled(!!s.enabled)
    setSignedIn(!!s.signedIn)
    setMyName(s.name || '')
  }

  async function refreshPair() {
    const s = await fetch('/api/state/', { cache: 'no-store' }).then(r => r.json())
    setTitle(s.arenaTitle || 'Arena')
    setItemsCount((s.items || []).length)
    const r = await fetch('/api/pair/', { cache: 'no-store' }).then(r => r.json())
    setPair(r.pair)
  }

  async function refreshLeaderboards() {
    const g = await fetch('/api/leaderboard/global/', { cache: 'no-store' }).then(r => r.json())
    setGlobalRows(g.ready ? g.rows : [])

    const p = await fetch('/api/leaderboard/personal/', { cache: 'no-store' }).then(r => r.json())
    const s = await fetch('/api/state/', { cache: 'no-store' }).then(r => r.json())
    setItemsCount((s.items || []).length)

    if (p.enabled === false) {
      setPersonalMode('anon')
      const map = JSON.parse(localStorage.getItem('personalRatings') || '{}')
      const nameById = new Map((s.items as Item[]).map(it => [it.id, it.name]))
      Object.keys(map).forEach(k => { if (!nameById.has(k)) delete map[k] })
      localStorage.setItem('personalRatings', JSON.stringify(map))
      const rows = Object.entries(map)
        .map(([id, rating]: any) => ({ id, name: nameById.get(id), rating: Number(rating) }))
        .filter(r => r.name)
        .sort((a, b) => b.rating - a.rating)
        .map((row, i) => ({ rank: i + 1, ...row }))
      setPersonalRows(rows)
    } else if (p.signedIn) {
      setPersonalMode('signedIn')
      setPersonalRows(p.rows || [])
    } else {
      setPersonalMode('signedOut')
      setPersonalRows([])
    }
  }

  async function doVote(side: 'left' | 'right') {
    const current = pairRef.current
    if (!current || busyRef.current || !canVoteRef.current) return
    busyRef.current = true
    setBusy(true)

    const winner = side === 'left' ? current[0] : current[1]
    const loser = side === 'left' ? current[1] : current[0]

    const res = await fetch('/api/vote/', {
      method: 'POST',
      body: JSON.stringify({ winnerId: winner.id, loserId: loser.id }),
    })
    if (res.status === 403) {
      setBusy(false); busyRef.current = false
      await refreshSignIn()
      return
    }

    if (!signInEnabled) updateLocalPersonal(winner.id, loser.id)

    setBusy(false); busyRef.current = false
    refreshPair()
    refreshLeaderboards()
  }

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
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const sig = await collectFingerprint()
        await fetch('/api/device/identify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sig }),
        })
      } catch {}
      await refreshSignIn()
      await refreshPair()
      await refreshLeaderboards()
    })()
  }, [])

  function renderItem(it: Item | null) {
    if (!it) return null
    return (
      <div className="flex flex-col items-center gap-4">
        {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="rounded-xl max-h-[320px]" /> : null}
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
                await refreshSignIn()
                await refreshLeaderboards()
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
                    {globalRows.map((r: any) => (
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
                    {personalRows.map((r: any) => (
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
