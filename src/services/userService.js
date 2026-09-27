import { db } from './firebase'
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, limit } from 'firebase/firestore'
import { sanitizeText } from '../utils/sanitize'

const COL = 'users'

export async function syncUserDoc(uid, username, socialLinks = {}, favoriteGames = null) {
  const clean = sanitizeText(username, 30)
  const cleanLinks = {}
  for (const [platform, val] of Object.entries(socialLinks)) {
    const id = typeof val === 'object' ? val?.id : val
    cleanLinks[platform] = sanitizeText(id ?? '', 30) || null
  }
  const payload = {
    uid,
    username:      clean,
    usernameLower: clean.toLowerCase(),
    socialLinks:   cleanLinks,
  }
  if (Array.isArray(favoriteGames)) payload.favoriteGames = favoriteGames
  await setDoc(doc(db, COL, uid), payload, { merge: true })
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, COL, uid))
  return snap.exists() ? snap.data() : null
}

// Subscribes to user docs for a list of UIDs, calls callback with { [uid]: username } map.
// Returns unsubscribe function.
export function subscribeUsernames(uids, callback) {
  if (!uids.length) { callback({}); return () => {} }
  const map = {}
  const unsubs = uids.map(uid =>
    onSnapshot(doc(db, COL, uid), snap => {
      if (snap.exists()) map[uid] = snap.data().username
      callback({ ...map })
    })
  )
  return () => unsubs.forEach(u => u())
}

export async function searchUsers(rawQuery) {
  const q = sanitizeText(rawQuery, 30).toLowerCase()
  if (q.length < 2) return []
  const end = q + ''
  const snap = await getDocs(
    query(
      collection(db, COL),
      where('usernameLower', '>=', q),
      where('usernameLower', '<=', end),
      limit(10),
    )
  )
  return snap.docs.map(d => d.data())
}
