'use client'
import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { Section } from '@/components/Section'

type Role = 'none' | 'admin' | 'super_admin' | 'oj_holder'

type OjConfig = {
  signInEnabled: boolean
  allowedNames: string[]
  slotLimits: Record<string, number>
  extraSlots: Record<string, number>
  sessionsByName: Record<string, number>
}

export default function Admin() {
  const [role, setRole] = useState<Role>('none')
  const [result, setResult] = useState('')
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [localNames, setLocalNames] = useState<Record<string, string>>({})
  const [ojStatus, setOjStatus] = useState<any>(null)

  // OJ config state
  const [cfg, setCfg] = useState<OjConfig | null>(null)
  const [namesText, setNamesText] = useState('')
  const [slotLines, setSlotLines] = useState('') // "name=2" per line
  const [extraLines, setExtraLines] = useState('') // "name=1" per line
  const [signoutSelection, setSignoutSelection] = useState<Record<string, boolean>>({})

  async function ensureFp() {
    await fetch('/api/signin/status/', { cache: 'no-store' })
  }
  async function me() {
    const r = await fetch('/api/admin/me/', { cache: 'no-store' }).then((r) => r.json())
    setRole(r.role)
  }
  async function loadTitle() {
    const s = await fetch('/api/state/', { cache: 'no-store' }).then((r) => r.json())
    setTitle(s.arenaTitle || 'Arena')
  }
  async function loadItems() {
    const s = await fetch('/api/state/', { cache: 'no-store' }).then((r) => r.json())
    setItems(s.items || [])
    setLocalNames(Object.fromEntries((s.items || []).map((it: any) => [it.id, it.name])))
  }
  async function loadOj() {
    if (role === 'admin') return
    const r = await fetch('/api/oj/status/', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
    setOjStatus(r)
  }
  async function login(pwd: string) {
    const r = await fetch('/api/admin/login/', {
      method: 'POST',
      body: JSON.stringify({ password: pwd }),
      headers: { 'content-type': 'application/json' },
    }).then((r) => r.json())
    if (r.outcome === 'invalid') setResult('Incorrect password')
    if (r.outcome === 'admin') {
      setResult('Admin access granted.')
      setRole('admin')
    }
    if (r.outcome === 'super_admin' || r.outcome === 'oj_holder') {
      setResult('Super Admin access granted.')
      setRole(r.outcome)
    }
    loadOj()
    loadItems()
    loadTitle()
    loadOjConfig()
  }

  async function loadOjConfig() {
    if (!(role === 'super_admin' || role === 'oj_holder')) return
    const data: OjConfig = await fetch('/api/oj/config/', { cache: 'no-store' }).then((r) => r.json())
    setCfg(data)
    setNamesText((data.allowedNames || []).join('\n'))
    const toLines = (obj: Record<string, number>) =>
      Object.keys(obj)
        .sort((a, b) => a.localeCompare(b))
        .map((k) => `${k}=${obj[k]}`)
        .join('\n')
    setSlotLines(toLines(data.slotLimits || {}))
    setExtraLines(toLines(data.extraSlots || {}))
    setSignoutSelection(Object.fromEntries(Object.keys(data.sessionsByName || {}).map((n) => [n, false])))
  }

  useEffect(() => {
    ensureFp().then(me).then(loadItems).then(loadTitle).then(loadOj).then(loadOjConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role === 'none' ? 'start' : 'ready'])

  async function saveName(id: string) {
    const current = items.find((it) => it.id === id)?.name ?? ''
    const next = (localNames[id] ?? '').trim()
    if (!next || next === current) return
    const res = await fetch('/api/items/rename/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, name: next }),
    })
    if (!res.ok) {
      setLocalNames((prev) => ({ ...prev, [id]: current }))
      return
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, name: next } : it)))
  }

  if (role === 'none') {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
            <div className="space-y-2">
              <label className="text-sm text-subtext">Admin password</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const val = (form.elements.namedItem('pwd') as HTMLInputElement).value
                  login(val)
                }}
                className="flex gap-2"
              >
                <input name="pwd" type="password" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2" />
                <button className="rounded-lg bg-primary text-primaryFg px-3 py-2">Sign In</button>
              </form>
              <div className="text-sm text-warning">{result}</div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-sm">{role === 'admin' ? 'Admin access granted.' : 'Super Admin access granted.'}</div>
        <button
          onClick={async () => {
            await fetch('/api/admin/logout/', { method: 'POST' })
            location.reload()
          }}
          className="rounded-lg border border-border px-3 py-1.5 hover:border-primary"
        >
          Logout
        </button>
      </div>

      <Section title="Arena Settings">
        <Card>
          <div className="p-6 space-y-3">
            <div className="flex gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2"
              />
              <button
                onClick={async () => {
                  await fetch('/api/arena/title/', {
                    method: 'POST',
                    body: JSON.stringify({ title }),
                    headers: { 'content-type': 'application/json' },
                  })
                  loadTitle()
                }}
                className="rounded-lg bg-primary text-primaryFg px-4"
              >
                Save
              </button>
            </div>

            <form
              className="flex items-center gap-3"
              onSubmit={async (e) => {
                e.preventDefault()
                const input = (e.target as HTMLFormElement).elements.namedItem('files') as HTMLInputElement
                if (!input.files?.length) return
                const form = new FormData()
                for (const f of Array.from(input.files)) form.append('files', f)
                await fetch('/api/items/upload/', { method: 'POST', body: form })
                input.value = ''
                loadItems()
              }}
            >
              <input name="files" type="file" accept="image/*" multiple className="rounded-lg border border-border bg-bg px-3 py-2" />
              <button className="rounded-lg border border-border px-3 py-2 hover:border-primary">Upload</button>
            </form>

            <form
              className="flex items-center gap-3"
              onSubmit={async (e) => {
                e.preventDefault()
                const input = (e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement
                const name = input.value.trim()
                if (!name) return
                await fetch('/api/items/addText/', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ name }),
                })
                input.value = ''
                loadItems()
              }}
            >
              <input name="name" placeholder="Add text item" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2" />
              <button className="rounded-lg border border-border px-3 py-2 hover:border-primary">Add</button>
            </form>
          </div>
        </Card>
      </Section>

      <Section title="Items">
        <Card>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead className="text-subtext">
                <tr className="text-left">
                  <th className="w-[56px]">Preview</th>
                  <th className="w-[40%]">Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-12 h-12 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-md border border-border flex items-center justify-center text-[10px] text-subtext"
                          aria-label="Text item (no image)"
                          title="Text item"
                        >
                          TXT
                        </div>
                      )}
                    </td>
                    <td className="py-2">
                      <input
                        value={localNames[it.id] ?? ''}
                        onChange={(e) => setLocalNames((s) => ({ ...s, [it.id]: e.target.value }))}
                        onBlur={() => saveName(it.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            ;(e.currentTarget as HTMLInputElement).blur()
                          }
                        }}
                        className="w-full rounded-md border border-border bg-bg px-2 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        className="rounded-md border border-border px-2 py-1 hover:border-primary"
                        onClick={async () => {
                          await fetch('/api/items/reset/', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ id: it.id }),
                          })
                          loadItems()
                        }}
                      >
                        Reset
                      </button>
                      <button
                        className="ml-2 rounded-md border border-border px-2 py-1 hover:border-negative"
                        onClick={async () => {
                          await fetch('/api/items/remove/', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ id: it.id }),
                          })
                          loadItems()
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {(role === 'super_admin' || role === 'oj_holder') && (
        <>
          <Section title="OJ Lock & Admin Tools">
            <Card>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={async () => {
                      await ensureFp()
                      const r = await fetch('/api/oj/claim/', { method: 'POST' }).then((r) => r.json())
                      setOjStatus(r)
                    }}
                  >
                    Claim OJ
                  </button>
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={async () => {
                      const r = await fetch('/api/oj/release/', { method: 'POST' }).then((r) => r.json())
                      setOjStatus(r)
                    }}
                  >
                    Release OJ
                  </button>
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={async () => {
                      const r = await fetch('/api/oj/reset/', { method: 'POST' }).then((r) => r.json())
                      setOjStatus(r)
                    }}
                  >
                    Reset OJ
                  </button>
                  <span className="text-sm text-subtext">
                    {ojStatus ? (ojStatus.holder ? `Held since ${ojStatus.since}${ojStatus.youHold ? ' (you)' : ''}` : 'Free') : ''}
                  </span>
                </div>
              </div>
            </Card>
          </Section>

          <Section title="Access & Sessions (OJ-only)">
            <Card>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-subtext">Require sign-in for voting</div>
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={async () => {
                      const next = !cfg?.signInEnabled
                      await fetch('/api/oj/config/', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ signInEnabled: next }),
                      })
                      loadOjConfig()
                    }}
                  >
                    {cfg?.signInEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-subtext">Allowed names (one per line)</div>
                  <textarea
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 h-32"
                    value={namesText}
                    onChange={(e) => setNamesText(e.target.value)}
                  />
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={async () => {
                      await fetch('/api/oj/config/', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ allowedNamesText: namesText }),
                      })
                      loadOjConfig()
                    }}
                  >
                    Save names
                  </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm text-subtext">Base slots per name — format: name=number</div>
                    <textarea
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 h-32"
                      value={slotLines}
                      onChange={(e) => setSlotLines(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-subtext">Extra slots per name — format: name=number</div>
                    <textarea
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 h-32"
                      value={extraLines}
                      onChange={(e) => setExtraLines(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                  onClick={async () => {
                    const parseLines = (txt: string) => {
                      const out: Record<string, number> = {}
                      txt
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .forEach((line) => {
                          const [k, v] = line.split('=')
                          const n = Number(v)
                          if (k && !Number.isNaN(n)) out[k.trim()] = Math.max(0, Math.floor(n))
                        })
                      return out
                    }
                    await fetch('/api/oj/config/', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ slotLimits: parseLines(slotLines), extraSlots: parseLines(extraLines) }),
                    })
                    loadOjConfig()
                  }}
                >
                  Save slot settings
                </button>

                <div className="space-y-2">
                  <div className="text-sm text-subtext">Active sessions</div>
                  {cfg && Object.keys(cfg.sessionsByName || {}).length ? (
                    <div className="space-y-2">
                      {Object.entries(cfg.sessionsByName).map(([name, count]) => (
                        <label key={name} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!signoutSelection[name]}
                            onChange={(e) => setSignoutSelection((s) => ({ ...s, [name]: e.target.checked }))}
                          />
                          <span>
                            {name} <span className="text-subtext">({count})</span>
                          </span>
                        </label>
                      ))}
                      <button
                        className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                        onClick={async () => {
                          const names = Object.keys(signoutSelection).filter((n) => signoutSelection[n])
                          if (!names.length) return
                          await fetch('/api/oj/forceSignout/', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ names }),
                          })
                          setSignoutSelection({})
                          loadOjConfig()
                        }}
                      >
                        Force sign-out selected
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-subtext">No active sessions.</div>
                  )}
                </div>
              </div>
            </Card>
          </Section>

          <Section title="Data (OJ-only)">
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                    onClick={() => {
                      window.location.href = '/api/oj/export/'
                    }}
                  >
                    Export arena JSON
                  </button>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const text = await f.text()
                        await fetch('/api/oj/import/', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ data: JSON.parse(text), preserveSignIn: true }),
                        })
                        alert('Imported. Reloading.')
                        location.reload()
                      }}
                    />
                  </label>
                  <button
                    className="rounded-md border border-border px-3 py-1.5 hover:border-negative"
                    onClick={async () => {
                      if (
                        !confirm(
                          'Reset all arena data (items, ratings, stats)? Sign-in config and sessions will be preserved.'
                        )
                      )
                        return
                      await fetch('/api/oj/resetArena/', { method: 'POST' })
                      alert('Arena data reset.')
                      location.reload()
                    }}
                  >
                    Reset arena data
                  </button>
                </div>
                <div className="text-xs text-subtext">
                  Reset clears items, ratings, wins/appearances, name overrides, contributions, and active pairs. Sign-in
                  configuration and active sessions are preserved.
                </div>
              </div>
            </Card>
          </Section>
        </>
      )}
    </div>
  )
}
