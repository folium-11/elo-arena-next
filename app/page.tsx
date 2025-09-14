'use client'
import { useEffect, useRef, useState } from 'react'
import Card from '@/components/Card'
import { Section } from '@/components/Section'

type Item = { id: string; name: string; imageUrl?: string | null }
type Pair = [Item, Item]
type PersonalMode = 'anon' | 'signedIn' | 'signedOut'

const K = 32
function expected(a: number, b: number) {
  return 1 / (1 + Math.pow(10, (b - a) / 400))
}
function updateLocalPersonal(winnerId: string, loserId: string) {
  const raw = localStorage.getItem('personalRatings') || '{}'
  const map: Record<string, number> = JSON.parse(raw)
  if (map[winnerId] == null) map[winnerId] = 1500
  if (map[loserId] == null) map[loserId] = 1500
  const wa = map[winnerId]
  const lb = map[loserId]
  const ea = expected(wa, lb)
  const eb = expected(lb, wa)
  map[winnerId] = Math.round(wa + K * (1 - ea))
  map[loserId] = Math.round(lb + K * (0 - eb))
  localStorage.setItem('personalRatings', JSON.stringify(map))
}

export default function Home() {
  const [title, setTitle] = useState('Arena')
  const [pair, setPair] = useState<Pair | null>(null)
  const [busy, setBusy] = useState(false)
  const [globalRows, setGlobalRows] = useState<any[]>([])
  const [personalRows, setPersonalRows] = useState<any[]>([])
  const [itemsCount, setItemsCount] = useState(0)

  // sign-in state
  const [signInEnabled, setSignInEnabled] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [myName, setMyName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [signInError, setSignInError] = useState<string | null>(null)

  const [personalMode, setPersonalMode] = useState<PersonalMode>('anon')

  const canVote = !signInEnabled || signedIn
  const keydownRef = useRef<(e: KeyboardEvent) => void>()

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

  async function vote(side: 'left' | 'right') {
    if (!pair || busy || !canVote) return
    setBusy(true)
    const winner = side === 'left' ? pair[0] : pair[1]
    const loser = side === 'left' ? pair[1] : pair[0]
    const res = await fetch('/api/vote/', {
      method: 'POST',
      body: JSON.stringify({ winnerId: winner.id, loserId: loser.id }),
    })
    if (res.status === 403) {
      setBusy(false)
      await refreshSignIn()
      return
    }
    if (!signInEnabled) updateLocalPersonal(winner.id, loser.id)
    setBusy(false)
    refreshPair()
    refreshLeaderboards()
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
      setPersonalRows(p.rows)
    } else {
      setPersonalMode('signedOut')
      setPersonalRows([])
    }
  }

  function renderItem(it: Item | null) {
    if (!it) return null
    return (
      <div className="flex flex-col items-center gap-3">
        {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="rounded-xl max-h-[360px]" /> : null}
        <div className="text-sm text-subtext">{it.name}</div>
      </div>
    )
  }

  // Keyboard voting: attach once, refresh logic when canVote changes
  useEffect(() => {
    keydownRef.current = (e: KeyboardEvent) => {
      // Ignore when typing in form fields/contenteditable
      const target = e.target as HTMLElement | null
      const tag = (target?.tagName || '').toLowerCase()
      const inEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable
      if (inEditable) return

      if (!canVote) return

      const k = e.key
      if (k === 'ArrowLeft' || k === 'Left') {
        e.preventDefault()
        vote('left')
      } else if (k === 'ArrowRight' || k === 'Right') {
        e.preventDefault()
        vote('right')
      }
    }

    const handler = (ev: KeyboardEvent) => keydownRef.current?.(ev)
    window.addEventListener('keydown', handler, { passive: false })
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canVote])

  useEffect(() => {
    refreshSignIn()
    refreshPair()
    refreshLeaderboards()
  }, [])

  const ShortcutHint = (
    <span className="text-xs text-subtext">Tip: use ← / → to vote</span>
  )

  return (
    <div className="space-y-10">
      {/* Header / sign-in strip with shortcut hint */}
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
                  const t = await res.text()
                  setSignInError(t || 'Sign-in failed')
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
                placeholder="Enter your allowed name"
                className="rounded-md border border-border bg-bg px-2 py-1"
              />
              <button className="rounded-md border border-border px-2 py-1 hover:border-primary">Sign In</button>
              {signInError ? <span className="text-warning">{signInError}</span> : <span>{ShortcutHint}</span>}
            </form>
          )
        ) : (
          ShortcutHint
        )}
      </div>

      {/* Arena */}
      {itemsCount < 2 ? (
        <Card>
          <div className="p-6 text-sm text-subtext">Add at least 2 items to start the arena.</div>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 p-6">
            <div className="flex flex-col items-center gap-4">
              {renderItem(pair ? pair[0] : null)}
              <button
                disabled={!pair || busy || !canVote}
                onClick={() => vote('left')}
                aria-keyshortcuts="ArrowLeft,Left"
                className="rounded-lg bg-primary text-primaryFg px-4 py-2 disabled:opacity-60"
              >
                {canVote ? 'Choose Left (←)' : 'Sign in to vote'}
              </button>
            </div>
            <div className="text-subtext text-sm md:px-4 md:py-8 text-center">vs</div>
            <div className="flex flex-col items-center gap-4">
              {renderItem(pair ? pair[1] : null)}
              <button
                disabled={!pair || busy || !canVote}
                onClick={() => vote('right')}
                aria-keyshortcuts="ArrowRight,Right"
                className="rounded-lg bg-primary text-primaryFg px-4 py-2 disabled:opacity-60"
              >
                {canVote ? 'Choose Right (→)' : 'Sign in to vote'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboards */}
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
