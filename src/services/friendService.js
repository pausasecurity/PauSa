// ============================================================
// FRIEND SERVICE — Firestore-backed
// Collection: friendships
// Doc-ID: ${uid_lower}_${uid_higher}  (sorted, kein Duplikat möglich)
// Shape: { users[], from, to, fromUsername, toUsername, status, createdAt }
// ============================================================

import { db } from './firebase'
import {
  collection, doc, setDoc, getDoc, deleteDoc, updateDoc,
  onSnapshot, query, where, getDocs, writeBatch,
} from 'firebase/firestore'
import { sanitizeText } from '../utils/sanitize'

const COL = 'friendships'

function sortedPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

function docId(uid1, uid2) {
  const [a, b] = sortedPair(uid1, uid2)
  return `${a}_${b}`
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

// Alle Freundschaften für myUid — gibt unsubscribe zurück
// callback({ accepted, pendingSent, pendingReceived }) — jede Liste enthält { docId, ...fdoc }
export function subscribeFriends(myUid, callback) {
  const q = query(collection(db, COL), where('users', 'array-contains', myUid))
  return onSnapshot(q, snap => {
    const all = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
    callback({
      accepted:        all.filter(f => f.status === 'accepted'),
      pendingSent:     all.filter(f => f.status === 'pending' && f.from === myUid),
      pendingReceived: all.filter(f => f.status === 'pending' && f.to   === myUid),
    })
  })
}

// Einzelne Beziehung zwischen zwei Usern — für PlayerProfileCard
export function subscribeFriendDoc(myUid, otherUid, callback) {
  return onSnapshot(doc(db, COL, docId(myUid, otherUid)), snap => {
    callback(snap.exists() ? { docId: snap.id, ...snap.data() } : null)
  })
}

// ---- Mutationen ----

export async function sendFriendRequest(fromUser, toUserId, toUsername) {
  const id = docId(fromUser.userId, toUserId)
  const existing = await getDoc(doc(db, COL, id))
  if (existing.exists()) throw new Error('Anfrage existiert bereits oder ihr seid bereits befreundet.')
  const [uid1, uid2] = sortedPair(fromUser.userId, toUserId)
  await setDoc(doc(db, COL, id), {
    users:        [uid1, uid2],
    from:         fromUser.userId,
    to:           toUserId,
    fromUsername: sanitizeText(fromUser.username, 30),
    toUsername:   sanitizeText(toUsername, 30),
    status:       'pending',
    createdAt:    new Date().toISOString(),
  })
}

export async function cancelFriendRequest(fDocId) {
  await deleteDoc(doc(db, COL, fDocId))
}

export async function acceptFriendRequest(fDocId) {
  await updateDoc(doc(db, COL, fDocId), { status: 'accepted' })
}

export async function rejectFriendRequest(fDocId) {
  await deleteDoc(doc(db, COL, fDocId))
}

export async function removeFriend(fDocId) {
  await deleteDoc(doc(db, COL, fDocId))
}

export async function updateUsernameInFriendships(userId, newUsername) {
  const clean = sanitizeText(newUsername, 30)
  const batch = writeBatch(db)

  const fromSnap = await getDocs(query(collection(db, COL), where('from', '==', userId)))
  fromSnap.docs.forEach(d => batch.update(d.ref, { fromUsername: clean }))

  const toSnap = await getDocs(query(collection(db, COL), where('to', '==', userId)))
  toSnap.docs.forEach(d => batch.update(d.ref, { toUsername: clean }))

  await batch.commit()
}

export async function getFriendCount(userId) {
  const snap = await getDocs(
    query(collection(db, COL), where('users', 'array-contains', userId), where('status', '==', 'accepted'))
  )
  return snap.size
}
