'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type DialogState =
  | { type: 'none' }
  | { type: 'confirm'; title?: string; message: string; resolve: (v: boolean) => void }
  | { type: 'alert'; title?: string; message: string; resolve: () => void }

type DialogAPI = {
  confirm: (message: string, title?: string) => Promise<boolean>
  alert: (message: string, title?: string) => Promise<void>
}

const DialogCtx = createContext<DialogAPI | null>(null)

export function useDialog() {
  const ctx = useContext(DialogCtx)
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>')
  return ctx
}

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dlg, setDlg] = useState<DialogState>({ type: 'none' })

  const confirm = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setDlg({ type: 'confirm', message, title, resolve })
    })
  }, [])

  const alert = useCallback((message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      setDlg({ type: 'alert', message, title, resolve })
    })
  }, [])

  const api = useMemo<DialogAPI>(() => ({ confirm, alert }), [confirm, alert])

  const close = () => setDlg({ type: 'none' })

  return (
    <DialogCtx.Provider value={api}>
      {children}
      {/* Overlay modal */}
      {dlg.type !== 'none' && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface/95 shadow-2xl">
              <div className="p-5 space-y-3">
                {(dlg.type === 'confirm' || dlg.type === 'alert') && (
                  <>
                    {dlg.title && <div className="text-lg font-semibold">{dlg.title}</div>}
                    <div className="text-sm text-subtext whitespace-pre-line">{dlg.message}</div>
                    <div className="pt-2 flex items-center justify-end gap-2">
                      {dlg.type === 'confirm' && (
                        <>
                          <button
                            onClick={() => {
                              dlg.resolve(false)
                              close()
                            }}
                            className="rounded-md border border-border px-3 py-1.5 hover:border-primary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              dlg.resolve(true)
                              close()
                            }}
                            className="rounded-md bg-primary text-white px-3 py-1.5 hover:bg-primary transition-colors duration-200 ease-in-out"
                          >
                            Confirm
                          </button>
                        </>
                      )}
                      {dlg.type === 'alert' && (
                        <button
                          onClick={() => {
                            dlg.resolve()
                            close()
                          }}
                          className="rounded-md bg-primary text-white px-3 py-1.5 hover:bg-primary"
                        >
                          OK
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}


