// ============================================================
// FRIEND SERVICE — Supabase-backed
// Tabelle: friendships (from_id, to_id, status) — Unique-Paar serverseitig
// Shape nach außen: { docId, users[], from, to, fromUsername, toUsername, status, createdAt }
// ============================================================

import { supabase, must, liveQuery, isUuid } from './supabase'

const SELECT = 'id, from_id, to_id, status, created_at, from_p:profiles!from_id(username), to_p:profiles!to_id(username)'

function toFriend(r) {
  return {
    docId:        r.id,
    users:        [r.from_id, r.to_id],
    from:         r.from_id,
    to:           r.to_id,
    fromUsername: r.from_p?.username ?? '',
    toUsername:   r.to_p?.username ?? '',
    status:       r.status,
    createdAt:    r.created_at,
  }
}

// Leitet aus einem Friendship-Doc die "Gegenseite" ab (Username + userId)
export function peerOf(fdoc, myUid) {
  return fdoc.from === myUid
    ? { userId: fdoc.to,   username: fdoc.toUsername   }
    : { userId: fdoc.from, username: fdoc.fromUsername }
}

// Leitet den Status aus Sicht von myUid ab
export function statusOf(fdoc, myUid) {
  if (!fdoc) return null
  if (fdoc.status === 'accepted') return 'accepted'
  return fdoc.from === myUid ? 'pending_sent' : 'pending_received'
}

// ---- Echtzeit-Subscriptions ----

// callback({ accepted, pendingSent, pendingReceived }) — gibt unsubscribe zurück
export function subscribeFriends(myUid, callback) {
  const fetchAll = async () => {
    const rows = must(await supabase.from('friendships').select(SELECT)
      .or(`from_id.eq.${myUid},to_id.eq.${myUid}`))
    return rows.map(toFriend)
  }
  return liveQuery([{ table: 'friendships' }], fetchAll, all => callback({
    accepted:        all.filter(f => f.status === 'accepted'),
    pendingSent:     all.filter(f => f.status === 'pending' && f.from === myUid),
    pendingReceived: all.filter(f => f.status === 'pending' && f.to   === myUid),
  }))
}

// Einzelne Beziehung zwischen zwei Usern — für PlayerProfileCard
export function subscribeFriendDoc(myUid, otherUid, callback) {
  if (!isUuid(myUid) || !isUuid(otherUid)) { callback(null); return () => {} }
  const fetchPair = async () => {
    const row = must(await supabase.from('friendships').select(SELECT)
      .or(`and(from_id.eq.${myUid},to_id.eq.${otherUid}),and(from_id.eq.${otherUid},to_id.eq.${myUid})`)
      .maybeSingle())
    return row ? toFriend(row) : null
  }
  return liveQuery([{ table: 'friendships' }], fetchPair, callback)
}

// ---- Mutationen ----

export async function sendFriendRequest(fromUser, toUserId) {
  if (!isUuid(toUserId)) throw new Error('Dieser Spieler kann nicht hinzugefügt werden.')
  try {
    must(await supabase.from('friendships').insert({ to_id: toUserId }))
  } catch (err) {
    if (err.code === '23505') throw new Error('Anfrage existiert bereits oder ihr seid bereits befreundet.')
    throw err
  }
}

export async function cancelFriendRequest(fDocId) {
  must(await supabase.from('friendships').delete().eq('id', fDocId))
}

export async function acceptFriendRequest(fDocId) {
  must(await supabase.from('friendships').update({ status: 'accepted' }).eq('id', fDocId))
}

export async function rejectFriendRequest(fDocId) {
  must(await supabase.from('friendships').delete().eq('id', fDocId))
}

export async function removeFriend(fDocId) {
  must(await supabase.from('friendships').delete().eq('id', fDocId))
}

export async function getFriendCount(userId) {
  if (!isUuid(userId)) return 0
  return must(await supabase.rpc('friend_count', { p_user: userId }))
}
