import { pb, subscribeList, isNotFound } from './pocketbase'
import { sanitizeText } from '../utils/sanitize'

const users = () => pb.collection('users')

function toUserDoc(r) {
  return {
    uid:           r.id,
    username:      r.username,
    usernameLower: r.usernameLower,
    socialLinks:   r.socialLinks ?? {},
    favoriteGames: r.favoriteGames ?? undefined,
  }
}

export async function syncUserDoc(uid, username, socialLinks = {}, favoriteGames = null) {
  const clean = sanitizeText(username, 30)
  const cleanLinks = {}
  for (const [platform, val] of Object.entries(socialLinks)) {
    const id = typeof val === 'object' ? val?.id : val
    cleanLinks[platform] = sanitizeText(id ?? '', 30) || null
  }
  const payload = {
    username:      clean,
    usernameLower: clean.toLowerCase(),
    socialLinks:   cleanLinks,
  }
  if (Array.isArray(favoriteGames)) payload.favoriteGames = favoriteGames
  await users().update(uid, payload)
}

export async function getUserDoc(uid) {
  try {
    return toUserDoc(await users().getOne(uid))
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

// Live-Map { [uid]: username } für eine Liste von UIDs. Gibt unsubscribe zurück.
export function subscribeUsernames(uids, callback) {
  if (!uids.length) { callback({}); return () => {} }
  const params = Object.fromEntries(uids.map((u, i) => [`u${i}`, u]))
  const filter = pb.filter(uids.map((_, i) => `id = {:u${i}}`).join(' || '), params)
  return subscribeList('users', { filter }, recs => {
    callback(Object.fromEntries(recs.map(r => [r.id, r.username])))
  })
}

export async function searchUsers(rawQuery) {
  const q = sanitizeText(rawQuery, 30).toLowerCase().replace(/%/g, '')
  if (q.length < 2) return []
  const res = await users().getList(1, 10, {
    filter: pb.filter('usernameLower ~ {:q}', { q: `${q}%` }),
  })
  return res.items.map(toUserDoc)
}
