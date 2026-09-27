import { pb } from './pocketbase'

const SESSIONS_KEY = 'pausa_rated_sessions'
const col = () => pb.collection('ratings')

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '{}') } catch { return {} }
}

// Unique-Index (lobbyId, raterId, targetId) verhindert Doppelbewertungen
export async function saveRating(lobbyId, raterId, targetId, targetUsername, stars, comment) {
  await col().create({
    lobbyId, raterId, targetId, targetUsername,
    stars, comment: comment?.trim() ?? '',
    at: new Date().toISOString(),
  })
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
  const recs = await col().getFullList({ filter: pb.filter('targetId = {:u}', { u: userId }) })
  return recs.map(({ lobbyId, raterId, targetId, targetUsername, stars, comment, at }) =>
    ({ lobbyId, raterId, targetId, targetUsername, stars, comment, at }))
}

export async function getAverageRating(userId) {
  const ratings = await getRatingsFor(userId)
  if (!ratings.length) return { avg: null, count: 0 }
  const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
  return { avg: Math.round(avg * 10) / 10, count: ratings.length }
}
