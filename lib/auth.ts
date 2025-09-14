// lib/auth.ts
import crypto from 'crypto'
import { cookies, headers } from 'next/headers'
import { readState } from '@/lib/state'
import { NextRequest, NextResponse } from 'next/server'

export type Role = 'admin' | 'super_admin'

export type ServerSession = {
  id: string
  roles: Role[]
  csrfSecret: string
  uaHash: string
  ipHash: string
  createdAt: string
  lastSeen: string
  expAt: string
  stepUpAt?: string
  revocationId: number
}

const SESSION_TTL_HOURS = 72
const STEP_UP_WINDOW_MIN = 20

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function clientHints() {
  const h = headers()
  const ua = h.get('user-agent') || ''
  // first XFF entry, if present
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || '0.0.0.0'
  return { uaHash: sha256(ua), ipHash: sha256(ip) }
}

// Stateless, signed cookie session (no filesystem store)
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || ''
  // In production we should have a real secret configured
  return secret || 'dev-insecure-secret'
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
}
function fromB64url(input: string) {
  input = input.replace(/-/g,'+').replace(/_/g,'/')
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : ''
  return Buffer.from(input + pad, 'base64')
}

function sign(data: string) {
  return b64url(crypto.createHmac('sha256', getSessionSecret()).update(data).digest())
}

function encodeSession(sess: ServerSession) {
  const payload = b64url(JSON.stringify(sess))
  const sig = sign(payload)
  return `v1.${payload}.${sig}`
}

function decodeSession(token: string | undefined): ServerSession | undefined {
  if (!token) return undefined
  if (!token.startsWith('v1.')) return undefined
  const parts = token.split('.')
  if (parts.length !== 3) return undefined
  const payload = parts[1]
  const sig = parts[2]
  if (sign(payload) !== sig) return undefined
  try {
    const obj = JSON.parse(fromB64url(payload).toString('utf-8'))
    return obj as ServerSession
  } catch {
    return undefined
  }
}

export function getSessionFromState(sid: string | undefined) {
  const s = readState()
  const sess = decodeSession(sid)
  return { s, session: sess }
}

export function touchAndPersistSession(_: any, sess: ServerSession) {
  const now = new Date()
  sess.lastSeen = now.toISOString()
  // sliding expiration
  const exp = new Date(now.getTime() + SESSION_TTL_HOURS * 3600 * 1000)
  sess.expAt = exp.toISOString()
  // Re-set cookie with refreshed payload
  const secure = process.env.NODE_ENV !== 'development'
  cookies().set('sid', encodeSession(sess), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600,
  })
}

export function createSession(roles: Role[]) {
  const { uaHash, ipHash } = clientHints()
  const now = new Date()
  const id = crypto.randomUUID()
  const csrfSecret = crypto.randomBytes(32).toString('hex')
  const exp = new Date(now.getTime() + SESSION_TTL_HOURS * 3600 * 1000)
  const sess: ServerSession = {
    id,
    roles,
    csrfSecret,
    uaHash,
    ipHash,
    createdAt: now.toISOString(),
    lastSeen: now.toISOString(),
    expAt: exp.toISOString(),
    revocationId: 0,
  }
  const secure = process.env.NODE_ENV !== 'development'
  cookies().set('sid', encodeSession(sess), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600,
  })
  return sess
}

export function destroySession() {
  const c = cookies()
  cookies().set('sid', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 0,
  })
}

export function currentSession() {
  const sid = cookies().get('sid')?.value
  const { s, session } = getSessionFromState(sid)
  if (!session) return { s, session: undefined as ServerSession | undefined }
  // basic binding/expiry checks (soft bind to UA/IP)
  const { uaHash } = clientHints()
  if (session.uaHash !== uaHash) return { s, session: undefined }
  if (new Date(session.expAt).getTime() <= Date.now()) return { s, session: undefined }
  touchAndPersistSession(s, session)
  return { s, session }
}

// OJ lock removed

export function needsStepUp(sess?: ServerSession) {
  if (!sess?.stepUpAt) return true
  const age = Date.now() - new Date(sess.stepUpAt).getTime()
  return age > STEP_UP_WINDOW_MIN * 60 * 1000
}

export function markStepUpNow(sess: ServerSession) {
  const s = readState()
  const found: ServerSession | undefined = s.serverSessions?.[sess.id]
  if (found) {
    found.stepUpAt = new Date().toISOString()
    touchAndPersistSession(s, found)
  }
}

export function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function forbid() {
  return new NextResponse('forbidden', { status: 403 })
}

export function stepUpRequired() {
  return new NextResponse('step_up_required', { status: 412 })
}

export function requireRoles(
  req: NextRequest,
  allowed: Array<Role>,
  opts?: { csrf?: boolean }
) {
  const { s, session } = currentSession()
  if (!session) return { error: new NextResponse('unauthorized', { status: 401 }) }

  const base = session.roles.some((r) => allowed.includes(r))
  if (!base) return { error: forbid() }

  // CSRF for state-changing methods
  const method = req.method.toUpperCase()
  const wantCsrf = opts?.csrf ?? (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS')
  if (wantCsrf) {
    const token = req.headers.get('x-csrf') || ''
    if (token !== session.csrfSecret) return { error: new NextResponse('bad_csrf', { status: 403 }) }
  }

  return { s, session }
}
