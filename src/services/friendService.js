// ============================================================
// FRIEND SERVICE — PocketBase-backed
// Collection: friendships  (userA < userB, Unique-Index auf dem Paar)
// Shape nach außen: { docId, users[], from, to, fromUsername, toUsername, status, createdAt }
// ============================================================

import { pb, subscribeList } from './pocketbase'
import { sanitizeText } from '../utils/sanitize'

const COL = 'friendships'
const col = () => pb.collection(COL)

function sortedPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

function pairFilter(uid1, uid2) {
  const [a, b] = sortedPair(uid1, uid2)
  return pb.filter('userA = {:a} && userB = {:b}', { a, b })
}

function toFriend(r) {
  return {
    docId:        r.id,
    users:        [r.userA, r.userB],
    from:         r.from,
    to:           r.to,
    fromUsername: r.fromUsername,
    toUsername:   r.toUsername,
    status:       r.status,
    createdAt:    r.createdAt,
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
  const filter = pb.filter('userA = {:u} || userB = {:u}', { u: myUid })
  return subscribeList(COL, { filter }, recs => {
    const all = recs.map(toFriend)
    callback({
      accepted:        all.filter(f => f.status === 'accepted'),
      pendingSent:     all.filter(f => f.status === 'pending' && f.from === myUid),
      pendingReceived: all.filter(f => f.status === 'pending' && f.to   === myUid),
    })
  })
}

// Einzelne Beziehung zwischen zwei Usern — für PlayerProfileCard
export function subscribeFriendDoc(myUid, otherUid, callback) {
  return subscribeList(COL, { filter: pairFilter(myUid, otherUid) }, recs => {
    callback(recs[0] ? toFriend(recs[0]) : null)
  })
}

// ---- Mutationen ----

export async function sendFriendRequest(fromUser, toUserId, toUsername) {
  const existing = await col().getList(1, 1, { filter: pairFilter(fromUser.userId, toUserId), fields: 'id' })
  if (existing.totalItems) throw new Error('Anfrage existiert bereits oder ihr seid bereits befreundet.')
  const [userA, userB] = sortedPair(fromUser.userId, toUserId)
  await col().create({
    userA, userB,
    from:         fromUser.userId,
    to:           toUserId,
    fromUsername: sanitizeText(fromUser.username, 30),
    toUsername:   sanitizeText(toUsername, 30),
    status:       'pending',
    createdAt:    new Date().toISOString(),
  })
}

export async function cancelFriendRequest(fDocId) {
  await col().delete(fDocId)
}

export async function acceptFriendRequest(fDocId) {
  await col().update(fDocId, { status: 'accepted' })
}

export async function rejectFriendRequest(fDocId) {
  await col().delete(fDocId)
}

export async function removeFriend(fDocId) {
  await col().delete(fDocId)
}

export async function updateUsernameInFriendships(userId, newUsername) {
  const clean = sanitizeText(newUsername, 30)
  const [fromRecs, toRecs] = await Promise.all([
    col().getFullList({ filter: pb.filter('from = {:u}', { u: userId }), fields: 'id' }),
    col().getFullList({ filter: pb.filter('to = {:u}',   { u: userId }), fields: 'id' }),
  ])
  await Promise.all([
    ...fromRecs.map(r => col().update(r.id, { fromUsername: clean })),
    ...toRecs.map(r   => col().update(r.id, { toUsername:   clean })),
  ])
}

export async function getFriendCount(userId) {
  const res = await col().getList(1, 1, {
    filter: pb.filter('(userA = {:u} || userB = {:u}) && status = "accepted"', { u: userId }),
    fields: 'id',
  })
  return res.totalItems
}
