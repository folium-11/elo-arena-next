import crypto from 'crypto'

const SECRET = process.env.DEVICE_ID_SECRET || 'dev-device-secret'

function hmac(payload: any) {
  const s = JSON.stringify(payload)
  return crypto.createHmac('sha256', SECRET).update(s).digest('hex')
}

export function deriveIds(sig: any) {
  const stable = {
    uaPlatform: sig.ua?.platform || '',
    uaMobile: !!sig.ua?.mobile,
    uaBrands: Array.isArray(sig.ua?.brands) ? sig.ua.brands.map((b: any) => `${b.brand}:${b.version}`) : [],
    lang: String(sig.lang || '').split('-')[0],
    tz: sig.tz || '',
    renderer: (sig.webgl?.renderer || '').toLowerCase(),
    vendor: (sig.webgl?.vendor || '').toLowerCase(),
    colorDepth: sig.screen?.colorDepth || 0,
    dpr: Math.round((sig.screen?.dpr || 1) * 100) / 100,
  }

  const full = {
    ...stable,
    width: sig.screen?.width || 0,
    height: sig.screen?.height || 0,
    canvas: sig.canvas?.hash || '',
    audio: sig.audio?.hash || '',
  }

  const bucketId = hmac(stable)
  const deviceId = hmac(full)
  return { bucketId, deviceId }
}

export function similarity(a: any, b: any) {
  let s = 0
  const low = (x?: string) => String(x || '').toLowerCase()

  if (low(a.webgl?.renderer) === low(b.webgl?.renderer)) s += 1
  if (low(a.webgl?.vendor) === low(b.webgl?.vendor)) s += 0.5

  if (String(a.lang || '').split('-')[0] === String(b.lang || '').split('-')[0]) s += 0.5
  if (String(a.tz || '') === String(b.tz || '')) s += 0.5

  if ((a.screen?.colorDepth || 0) === (b.screen?.colorDepth || 0)) s += 0.25
  const dprA = Math.round((a.screen?.dpr || 1) * 100) / 100
  const dprB = Math.round((b.screen?.dpr || 1) * 100) / 100
  if (dprA === dprB) s += 0.25

  const wa = a.screen?.width || 0, wb = b.screen?.width || 0
  const ha = a.screen?.height || 0, hb = b.screen?.height || 0
  const whOK = wb && hb && Math.abs(wa - wb) / wb <= 0.05 && Math.abs(ha - hb) / hb <= 0.05
  if (whOK) s += 0.5

  if ((a.canvas?.hash || '') && a.canvas?.hash === b.canvas?.hash) s += 1
  if ((a.audio?.hash || '') && a.audio?.hash === b.audio?.hash) s += 1

  return s
}
