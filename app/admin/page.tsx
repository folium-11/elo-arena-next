'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from '@/components/Card'
import { Section } from '@/components/Section'
import { useDialog } from '@/components/DialogProvider'
import FancySelect from '@/components/FancySelect'

type Item = { id: string; name: string; imageUrl?: string | null; imageData?: string | null }
type Role = 'none' | 'admin' | 'super_admin'

export default function AdminPage() {
  const dialog = useDialog()
  const [role, setRole] = useState<Role>('none')
  const [pass, setPass] = useState('')
  const [loginMsg, setLoginMsg] = useState<string | null>(null)

  const [title, setTitle] = useState('Arena')
  const [items, setItems] = useState<Item[]>([])
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadNote, setUploadNote] = useState('')

  const [textName, setTextName] = useState('')
  const [saveTitleBusy, setSaveTitleBusy] = useState(false)

  const [ojStatus, setOjStatus] = useState<any>(null)
  const [ojBusy, setOjBusy] = useState(false)

  const [signInEnabled, setSignInEnabled] = useState(false)
  const [allowedNamesText, setAllowedNamesText] = useState('')
  const [slotRows, setSlotRows] = useState<Array<{ name: string; base: number; extra: number }>>([])
  const [extraName, setExtraName] = useState('')
  const [extraInput, setExtraInput] = useState('')
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; since: string }>>([])
  const [selectedNames, setSelectedNames] = useState<Record<string, boolean>>({})
  const importInputRef = useRef<HTMLInputElement>(null)

  async function debugInfo() {
    try {
      const r = await fetch('/api/debug/', { cache: 'no-store' })
      if (r.ok) {
        const debug = await r.json()
        console.debug('[admin/debug] Full debug info:', debug)
        alert('Debug info logged to console. Check browser dev tools.')
      } else {
        console.debug('[admin/debug] Debug endpoint failed:', r.status, r.statusText)
        alert('Debug endpoint failed. Check console for details.')
      }
    } catch (e) {
      console.debug('[admin/debug] Debug request error:', e)
      alert('Debug request failed. Check console for details.')
    }
  }

  const whoami = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/status/', { cache: 'no-store' })
      const debugHeader = r.headers.get('x-debug')
      console.debug('[admin/debug] whoami response status:', r.status, 'debug:', debugHeader)
      
      if (r.ok) {
        const j = await r.json()
        if (j.role === 'super_admin') setRole('super_admin')
        else if (j.role === 'admin') setRole('admin')
        else setRole('none')
        if (j.debug?.expAt) console.debug('[admin/debug] session expAt', j.debug.expAt)
        console.debug('[admin/debug] whoami response:', j)
        return
      } else {
        console.debug('[admin/debug] whoami failed:', r.status, r.statusText)
      }
    } catch (e) {
      console.debug('[admin/debug] whoami error:', e)
    }
    setRole('none')
  }, [])

  const refreshState = useCallback(async () => {
    const r = await fetch('/api/state/', { cache: 'no-store' })
    if (!r.ok) return
    const s = await r.json()
    setTitle(s.arenaTitle || 'Arena')
    setItems((s.items || []) as Item[])
    setSignInEnabled(!!s.signInEnabled)
    const names: string[] = Array.isArray(s.allowedNames) ? s.allowedNames : []
    setAllowedNamesText(names.join('\n'))
    const rows: Array<{ name: string; base: number; extra: number }> = names.map((n) => ({
      name: n,
      base: Number.isFinite(s.slotLimits?.[n]) ? Math.max(0, Math.floor(s.slotLimits[n])) : 1,
      extra: Number.isFinite(s.extraSlots?.[n]) ? Math.max(0, Math.floor(s.extraSlots[n])) : 0,
    }))
    setSlotRows(rows)
    const sess: Array<{ id: string; name: string; since: string }> = Object.entries(s.activeSessions || {})
      .map(([id, v]: any) => ({ id, name: v?.name || '', since: v?.since || '' }))
      .filter((x) => x.name)
    setSessions(sess)
  }, [])

  const refreshOj = useCallback(async () => { setOjStatus(null) }, [])

  useEffect(() => {
    whoami()
  }, [whoami])

  useEffect(() => {
    if (role !== 'none') {
      refreshState()
      refreshOj()
    }
  }, [role, refreshState, refreshOj])

  async function login() {
    setLoginMsg(null)
    console.debug('[admin/debug] Attempting login with password length:', pass.length)
    const r = await fetch('/api/admin/login/', {
      method: 'POST',
      body: JSON.stringify({ password: pass }),
    })
    const debugHeader = r.headers.get('x-debug')
    console.debug('[admin/debug] Login response:', r.status, r.statusText, 'debug:', debugHeader)
    if (!r.ok) {
      let msg = 'Incorrect password'
      try {
        const err = await r.json()
        console.debug('[admin/debug] Login error response:', err)
        if (err?.error === 'super_admin_taken' && err?.message) msg = err.message
        if (err?.error === 'env_missing' && err?.message) msg = err.message
        if (err?.error === 'wrong_password' && err?.message) msg = err.message
      } catch (e) {
        console.debug('[admin/debug] Failed to parse error response:', e)
      }
      if (debugHeader) msg += ` (${debugHeader})`
      setLoginMsg(msg)
      return
    }
    const j = await r.json().catch(() => ({} as any))
    console.debug('[admin/debug] Login success response:', j)
    if (j.role === 'admin') {
      setRole('admin')
      setLoginMsg('Admin access granted.')
    } else if (j.role === 'super_admin') {
      setRole('super_admin')
      setLoginMsg('Super Admin access granted.')
    } else {
      setRole('none')
      setLoginMsg('Incorrect password')
    }
    setPass('')
  }

  async function signOutAdmin() {
    try {
      await fetch('/api/admin/logout/', { method: 'POST' })
    } catch {}
    setRole('none')
    setLoginMsg('Signed out.')
  }

  async function saveTitle() {
    setSaveTitleBusy(true)
    await fetch('/api/arena/title/', { method: 'POST', body: JSON.stringify({ title }) })
    setSaveTitleBusy(false)
    refreshState()
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadBusy(true)
    const fileWord = files.length === 1 ? 'file' : 'files'
    setUploadNote(`Uploading ${files.length} ${fileWord}…`)
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    const r = await fetch('/api/items/upload/', { method: 'POST', body: fd })
    if (!r.ok) setUploadNote('Upload failed')
    else setUploadNote('Upload complete')
    setUploadBusy(false)
    refreshState()
  }

  async function addText() {
    const name = textName.trim()
    if (!name) return
    await fetch('/api/items/addText/', { method: 'POST', body: JSON.stringify({ name }) })
    setTextName('')
    refreshState()
  }

  const renameItem = useCallback(async (id: string, name: string) => {
    const newName = name.trim()
    if (!newName) return
    await fetch('/api/items/rename/', { method: 'POST', body: JSON.stringify({ id, name: newName }) })
    refreshState()
  }, [refreshState])

  const removeItem = useCallback(async (id: string) => {
    const ok = await dialog.confirm('Remove this item?', 'Confirm removal')
    if (!ok) return
    await fetch('/api/items/remove/', { method: 'POST', body: JSON.stringify({ id }) })
    refreshState()
  }, [dialog, refreshState])

  async function toggleSignIn(next: boolean) {
    await fetch('/api/signin/enable/', {
      method: 'POST',
      body: JSON.stringify({ enabled: next }),
    })
    refreshState()
  }

  async function saveAllowedNames() {
    const names = allowedNamesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await fetch('/api/signin/allowed/', {
      method: 'POST',
      body: JSON.stringify({ names }),
    })
    refreshState()
  }

  async function saveExtra(name: string, extra: number) {
    await fetch('/api/signin/extra/', { method: 'POST', body: JSON.stringify({ name, extra }) })
    refreshState()
  }

  async function forceSignOutSelected() {
    const names = Object.entries(selectedNames)
      .filter(([_, v]) => v)
      .map(([k]) => k)
    if (names.length === 0) return
    const noun = names.length === 1 ? 'name' : 'names'
    const ok = await dialog.confirm(`Sign out ${names.length} ${noun}?`, 'Confirm sign-out')
    if (!ok) return
    await fetch('/api/signin/forceSignout/', { method: 'POST', body: JSON.stringify({ names }) })
    setSelectedNames({})
    refreshState()
  }

  async function claimOJ() {}

  async function releaseOJ() {}

  async function resetOJ() {}

  function exportState() {
    window.location.href = '/api/admin/export/'
  }

  async function importState(file: File | null) {
    if (!file) return
    const text = await file.text()
    await fetch('/api/admin/import/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: text,
    })
    refreshState()
  }

  async function resetArena() {
    const ok = await dialog.confirm('Reset all arena data? This preserves sign-in configuration and active sessions.', 'Confirm reset')
    if (!ok) return
    await fetch('/api/admin/reset/', { method: 'POST' })
    refreshState()
  }

  const itemsUI = useMemo(() => {
    if (!items.length) return <div className="text-sm text-subtext">No items yet.</div>
    return (
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 border border-border rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition-shadow">
            {it.imageUrl || it.imageData ? (
              <img
                src={it.imageUrl || it.imageData || ''}
                alt={it.name}
                className="h-16 w-16 object-cover rounded-2xl"
                onError={(e) => {
                  if (it.imageData && e.currentTarget.src !== it.imageData) {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = it.imageData
                  }
                }}
              />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl border border-border text-xs text-subtext">
                Text
              </div>
            )}
            <input
              defaultValue={it.name}
              onBlur={(e) => renameItem(it.id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              aria-label="Item name"
              className="flex-1 rounded-full border border-border bg-bg px-4 py-2"
              placeholder="Enter name"
            />
            <button
              onClick={() => removeItem(it.id)}
              className="rounded-full border border-border px-4 py-2 hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    )
  }, [items, removeItem, renameItem])

  if (role === 'none') {
    return (
      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            login()
          }}
          className="mt-12 flex flex-wrap items-start justify-center gap-3"
        >
          <div className="flex min-w-[16rem] flex-col">
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Admin password"
              aria-label="Admin password"
              className="rounded-full focus-visible:rounded-full border border-border bg-bg px-6 py-3 text-base"
            />
            {loginMsg && (
              <div className="mt-2 text-xs text-warning" role="status" aria-live="polite">
                {loginMsg}
              </div>
            )}
          </div>

          <button
            className="rounded-full focus-visible:rounded-full border border-border px-6 py-3 text-base hover:border-primary"
          >
            Sign In
          </button>

        </form>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {role === 'super_admin' ? 'Super Admin' : 'Admin'}
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-subtext">
            {role === 'super_admin' ? 'Access level: Super Admin' : 'Access level: Admin'}
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={debugInfo}
              className="rounded-full border border-border px-3 py-1 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)] text-xs"
            >
              Debug
            </button>
          )}
          <button
            onClick={signOutAdmin}
            className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
          >
            Sign Out
          </button>
        </div>
      </div>

      <Section title="Arena">
        <Card>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveTitle()}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="Arena title"
                aria-label="Arena title"
                className="w-72 md:w-[28rem] rounded-full border border-border bg-bg backdrop-blur-md px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
              />
              <button
                onClick={saveTitle}
                disabled={saveTitleBusy}
                className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)] disabled:opacity-60"
              >
                Save
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium">Upload images</div>
              <label className="inline-block">
                <span className="sr-only">Upload images</span>
                <span className="cursor-pointer rounded-full border border-border bg-surface px-5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">Choose files…</span>
                <input type="file" multiple accept="image/*" onChange={(e) => uploadFiles(e.currentTarget.files)} className="hidden" />
              </label>
              <div className="text-xs text-subtext">{uploadBusy ? uploadNote : uploadNote}</div>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addText()}
                placeholder="Add a text-only item"
                aria-label="Text item name"
                className="w-72 md:w-[28rem] rounded-full border border-border bg-bg backdrop-blur-md px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.15)]"
              />
              <button onClick={addText} className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                Add
              </button>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Items">
        <Card>
          <div className="p-4">{itemsUI}</div>
        </Card>
      </Section>

      {role === 'super_admin' && (
        <>
          <Section title="Sign-in & Sessions">
            <Card>
              <div className="p-4 space-y-6">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!signInEnabled}
                      onChange={(e) => toggleSignIn(e.currentTarget.checked)}
                    />
                    Enable sign-in
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Allowed names (one per line)</div>
                  <textarea
                    value={allowedNamesText}
                    onChange={(e) => setAllowedNamesText(e.target.value)}
                    placeholder={'Alice\nBob'}
                    className="w-full h-40 rounded-3xl border border-border bg-bg backdrop-blur-md p-4 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.15)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveAllowedNames}
                      className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
                    >
                      Save allowed names
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Extra slots per name</div>
                  {slotRows.length === 0 ? (
                    <div className="text-xs text-subtext">No names configured.</div>
                  ) : (
                    <div className="space-y-2">
                      <FancySelect
                        options={slotRows.map(r => ({ value: r.name, label: r.name }))}
                        value={extraName}
                        placeholder="Select a name"
                        onChange={(name) => {
                          setExtraName(name)
                          const row = slotRows.find((r) => r.name === name)
                          setExtraInput(row ? String(row.extra) : '0')
                        }}
                        className=""
                      />

                      {extraName && (
                        <div className="space-y-2 text-sm">
                          {(() => {
                            const row = slotRows.find((r) => r.name === extraName)
                            const base = row ? row.base : 1
                            const extra = row ? row.extra : 0
                            const inUse = sessions.filter((s) => s.name === extraName).length
                            const remaining = Math.max(0, base + extra - inUse)
                            return (
                              <>
                                <div>
                                  <span className="font-medium">Remaining:</span> {remaining}
                                </div>
                                <div className="text-xs text-subtext">(Base {base}, Extra {extra}, In Use {inUse})</div>
                              </>
                            )
                          })()}
                          <div className="flex items-center gap-2">
                            <span>Additional slots:</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              value={extraInput}
                              onChange={(e) => setExtraInput(e.currentTarget.value)}
                              className="w-24 rounded-md border border-border bg-bg px-2 py-1"
                            />
                            <button
                              onClick={() => {
                                const val = Math.max(0, Math.floor(Number(extraInput || 0)))
                                if (!extraName) return
                                saveExtra(extraName, val)
                              }}
                              className="rounded-md border border-border px-3 py-1 hover:border-primary"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Active sessions</div>
                  {sessions.length === 0 ? (
                    <div className="text-xs text-subtext">No active sessions.</div>
                  ) : (
                    <div className="space-y-1">
                      {sessions.map((sess) => {
                        const name = sess.name || ''
                        return (
                          <label key={`${sess.id}-${name}`} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!selectedNames[name]}
                              onChange={(e) => {
                                const checked = e.currentTarget.checked
                                setSelectedNames((prev) => ({ ...prev, [name]: checked }))
                              }}
                            />
                            <span className="w-40 truncate">{name}</span>
                            <span className="text-subtext truncate">{sess.id}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={forceSignOutSelected}
                    className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
                  >
                    Force sign-out selected
                  </button>
                </div>

              </div>
            </Card>
          </Section>

          <Section title="Data">
            <Card>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportState}
                    className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
                  >
                    Export JSON
                  </button>
                  <label className="inline-block">
                    <span className="sr-only">Import JSON</span>
                    <span className="cursor-pointer rounded-full border border-border bg-surface px-5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">Choose file…</span>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => importState(e.currentTarget.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={resetArena}
                    className="rounded-full border border-border px-5 py-2 bg-surface hover:border-primary shadow-[0_8px_30px_rgba(0,0,0,0.20)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.35)]"
                  >
                    Reset arena data
                  </button>
                </div>
                <div className="text-xs text-subtext">
                  Reset preserves sign-in configuration and active sessions.
                </div>
              </div>
            </Card>
          </Section>
        </>
      )}
    </div>
  )
}
