import { db } from './firebase'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

const SESSIONS_KEY = 'pausa_rated_sessions'
const COL = 'ratings'

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '{}') } catch { return {} }
}

export async function saveRating(lobbyId, raterId, targetId, targetUsername, stars, comment) {
  const id = `${lobbyId}__${raterId}__${targetId}`
  await setDoc(doc(db, COL, id), {
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
  const q = query(collection(db, COL), where('targetId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data())
}

export async function getAverageRating(userId) {
  const ratings = await getRatingsFor(userId)
  if (!ratings.length) return { avg: null, count: 0 }
  const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
  return { avg: Math.round(avg * 10) / 10, count: ratings.length }
}
