import { sanitizeItem, type Item, type State } from '@/lib/state'

export type PublicItem = { id: string; name: string; imageUrl?: string | null; imageData?: string | null }
export type Pair = [PublicItem, PublicItem]
export type GlobalLeaderboardRow = {
  rank: number
  id: string
  name: string
  rating: number
  w: number
  l: number
  wp: number
}
export type PersonalLeaderboardRow = { rank: number; id: string; name: string; rating: number }

export type PersonalSnapshot = {
  mode: 'anon' | 'signedOut' | 'signedIn'
  rows: PersonalLeaderboardRow[]
  signedIn: boolean
  name: string
}

function pickRandomPair(items: Item[]): [Item, Item] | null {
  if (items.length < 2) return null
  const firstIndex = Math.floor(Math.random() * items.length)
  let secondIndex = Math.floor(Math.random() * (items.length - 1))
  if (secondIndex >= firstIndex) secondIndex += 1
  return [items[firstIndex], items[secondIndex]]
}

export function sanitizeItemsForClient(state: State): PublicItem[] {
  return (state.items || []).map((it) => sanitizeItem(state, it))
}

export function buildGlobalLeaderboard(state: State): GlobalLeaderboardRow[] {
  const overrides = state.nameOverrides || {}
  const items = state.items || []

  return items
    .map((it) => {
      const id = it.id
      const rating = state.globalRatings[id] ?? 1500
      const wins = state.wins[id] ?? 0
      const appearances = state.appearances[id] ?? 0
      const losses = appearances - wins
      const winPct = appearances > 0 ? Math.round((wins / appearances) * 100) : 0
      return {
        id,
        name: overrides[id] || it.name,
        rating,
        w: wins,
        l: losses,
        wp: winPct,
      }
    })
    .sort((a, b) => b.rating - a.rating)
    .map((row, index) => ({ rank: index + 1, ...row }))
}

export function buildPersonalLeaderboard(state: State, did?: string | null): PersonalSnapshot {
  if (!state.signInEnabled) {
    return { mode: 'anon', rows: [], signedIn: false, name: '' }
  }

  if (!did) {
    return { mode: 'signedOut', rows: [], signedIn: false, name: '' }
  }

  const session = state.activeSessions?.[did]
  if (!session?.name) {
    return { mode: 'signedOut', rows: [], signedIn: false, name: '' }
  }

  const ratings: Record<string, number> = state.personalRatingsByDevice?.[did] || {}
  const items = state.items || []
  const overrides = state.nameOverrides || {}
  const nameById = new Map(items.map((it) => [it.id, overrides[it.id] || it.name]))

  const rows = Object.entries(ratings)
    .map(([id, rating]) => {
      const name = nameById.get(id)
      if (!name) return null
      return { id, name, rating: Number(rating) }
    })
    .filter((row): row is { id: string; name: string; rating: number } => !!row)
    .sort((a, b) => b.rating - a.rating)
    .map((row, index) => ({ rank: index + 1, ...row }))

  return { mode: 'signedIn', rows, signedIn: true, name: session.name }
}

export function ensureDevicePair(state: State, did?: string | null): { pair: Pair | null; mutated: boolean } {
  const items = state.items || []
  if (!did || items.length < 2) {
    return { pair: null, mutated: false }
  }

  const ids = new Set(items.map((it) => it.id))
  let pairIds = state.currentPairByDevice?.[did]
  let mutated = false

  const validatePair = (candidate?: [string, string]) =>
    !!candidate && ids.has(candidate[0]) && ids.has(candidate[1]) && candidate[0] !== candidate[1]

  if (!validatePair(pairIds)) {
    const picked = pickRandomPair(items)
    if (!picked) return { pair: null, mutated }
    pairIds = [picked[0].id, picked[1].id]
    state.currentPairByDevice = state.currentPairByDevice || {}
    state.currentPairByDevice[did] = pairIds
    mutated = true
  }

  const byId = new Map(items.map((it) => [it.id, sanitizeItem(state, it)]))
  const first = byId.get(pairIds![0])
  const second = byId.get(pairIds![1])
  if (!first || !second || first.id === second.id) {
    const picked = pickRandomPair(items)
    if (!picked) return { pair: null, mutated }
    state.currentPairByDevice = state.currentPairByDevice || {}
    state.currentPairByDevice[did] = [picked[0].id, picked[1].id]
    return {
      pair: [sanitizeItem(state, picked[0]), sanitizeItem(state, picked[1])],
      mutated: true,
    }
  }

  return { pair: [first, second], mutated }
}

export function assignNewPair(state: State, did?: string | null): Pair | null {
  const items = state.items || []
  if (!did || items.length < 2) return null
  const picked = pickRandomPair(items)
  if (!picked) return null
  state.currentPairByDevice = state.currentPairByDevice || {}
  state.currentPairByDevice[did] = [picked[0].id, picked[1].id]
  return [sanitizeItem(state, picked[0]), sanitizeItem(state, picked[1])]
}
