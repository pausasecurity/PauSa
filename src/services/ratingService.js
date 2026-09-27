import { supabase, must, isUuid } from './supabase'

const SESSIONS_KEY = 'pausa_rated_sessions'

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '{}') } catch { return {} }
}

// rater_id setzt die DB (auth.uid()); Unique (lobby, rater, target) verhindert Doppelbewertungen
export async function saveRating(lobbyId, raterId, targetId, targetUsername, stars, comment) {
  try {
    must(await supabase.from('ratings').insert({
      lobby_id:  lobbyId,
      target_id: targetId,
      stars,
      comment:   comment?.trim().slice(0, 500) ?? '',
    }))
  } catch (err) {
    if (err.code === '23505') throw new Error('Du hast diesen Spieler für diese Lobby bereits bewertet.')
    throw err
  }
}

export function markSessionRated(lobbyId, raterId) {
  const data = loadSessions()
  data[`${lobbyId}__${raterId}`] = true
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(data))
}

export function hasRatedSession(lobbyId, raterId) {
  return Boolean(loadSessions()[`${lobbyId}__${raterId}`])
}

export async function getRatingsFor(userId) {
  if (!isUuid(userId)) return []
  const rows = must(await supabase
    .from('ratings')
    .select('lobby_id, rater_id, target_id, stars, comment, created_at, target:profiles!target_id(username)')
    .eq('target_id', userId)
    .order('created_at', { ascending: false }))
  return rows.map(r => ({
    lobbyId:        r.lobby_id,
    raterId:        r.rater_id,
    targetId:       r.target_id,
    targetUsername: r.target?.username ?? '',
    stars:          r.stars,
    comment:        r.comment,
    at:             r.created_at,
  }))
}

export async function getAverageRating(userId) {
  const ratings = await getRatingsFor(userId)
  if (!ratings.length) return { avg: null, count: 0 }
  const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
  return { avg: Math.round(avg * 10) / 10, count: ratings.length }
}
