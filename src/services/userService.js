import { supabase, must, isUuid } from './supabase'
import { sanitizeText, sanitizeUsername } from '../utils/sanitize'

const PLATFORMS = ['steam', 'psn', 'xbox', 'epic', 'nintendo']

// { steam: { id } | 'id' } → { steam: 'id' } (nur gefüllte, bekannte Plattformen)
export function flattenSocialLinks(links = {}) {
  const out = {}
  for (const p of PLATFORMS) {
    const raw = links[p]
    const id  = sanitizeText(typeof raw === 'object' ? raw?.id ?? '' : raw ?? '', 30)
    if (id) out[p] = id
  }
  return out
}

function usernameError(err) {
  if (err.code === '23505') return new Error('Username ist bereits vergeben.')
  if (err.code === '23514') return new Error('Nur Buchstaben, Zahlen, _ und - (3–30 Zeichen).')
  return err
}

export async function usernameAvailable(name) {
  return must(await supabase.rpc('username_available', { p_name: sanitizeUsername(name) }))
}

export async function saveUsername(uid, username) {
  try {
    must(await supabase.from('profiles').update({ username: sanitizeUsername(username) }).eq('id', uid))
  } catch (err) {
    throw usernameError(err)
  }
}

export async function saveFavoriteGames(uid, favoriteGames) {
  must(await supabase.from('profiles').update({ favorite_games: favoriteGames.slice(0, 10) }).eq('id', uid))
}

export async function saveSocialLinks(uid, socialLinks) {
  must(await supabase.from('profile_socials').update({ links: flattenSocialLinks(socialLinks) }).eq('user_id', uid))
}

// socialLinks nur befüllt, wenn der Server sie freigibt (eigenes Profil / Freund / gemeinsame Lobby)
export async function getUserDoc(uid) {
  if (!isUuid(uid)) return null
  const row = must(await supabase
    .from('profiles')
    .select('id, username, username_lower, favorite_games, profile_socials(links)')
    .eq('id', uid)
    .maybeSingle())
  if (!row) return null
  return {
    uid:           row.id,
    username:      row.username,
    usernameLower: row.username_lower,
    favoriteGames: row.favorite_games ?? [],
    socialLinks:   row.profile_socials?.links ?? {},
  }
}

// { [uid]: username } — Usernames ändern sich selten, daher einmaliger Fetch statt Realtime
export function subscribeUsernames(uids, callback) {
  const ids = uids.filter(isUuid)
  if (!ids.length) { callback({}); return () => {} }
  let closed = false
  supabase.from('profiles').select('id, username').in('id', ids).then(({ data, error }) => {
    if (error) { console.error('[Supabase]', error); return }
    if (!closed) callback(Object.fromEntries(data.map(r => [r.id, r.username])))
  })
  return () => { closed = true }
}

export async function searchUsers(rawQuery) {
  const q = sanitizeText(rawQuery, 30).toLowerCase().replace(/[%_\\]/g, '\\$&')
  if (q.length < 2) return []
  const rows = must(await supabase
    .from('profiles')
    .select('id, username')
    .like('username_lower', `${q}%`)
    .not('username', 'is', null)
    .limit(10))
  return rows.map(r => ({ uid: r.id, username: r.username }))
}
