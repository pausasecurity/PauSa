import { db } from './firebase'
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, where, serverTimestamp,
} from 'firebase/firestore'
import { sanitizeText } from '../utils/sanitize'

export const RANK_OPTIONS = ['Keine', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Radiant']

export const LANGUAGE_OPTIONS = [
  { value: 'de',  label: 'Deutsch' },
  { value: 'en',  label: 'English' },
  { value: 'any', label: 'Egal'    },
]

const COL            = 'lobbies'
const TTL_MS         = 4 * 60 * 60 * 1000
const LEAVE_BLOCK_MS = 60 * 1000
const JOIN_BLOCK_MS  = 45 * 1000

// Leave-Cooldown bleibt in-memory (Reset bei Reload ist akzeptabel)
const _leftAt = new Map() // userId → timestamp (ms)

const SEED = [
  {
    game: 'Valorant', gameCategory: 'shooter',
    title: 'Suche 2 für Ranked – Platin+',
    description: 'Chill, kein Flame. Mic Pflicht. EU-West.',
    maxSlots: 5, requiresMic: true, language: 'de', minRank: 'Platin',
    members: [
      { userId: 'u4', username: 'IronForge77',  isReady: true,  joinedAt: 0 },
      { userId: 'u8', username: 'VortexStrike',  isReady: false, joinedAt: 0 },
      { userId: 'u6', username: 'GrimReaper_K',  isReady: true,  joinedAt: 0 },
    ],
    createdBy: { userId: 'u4', username: 'IronForge77' },
  },
  {
    game: 'Apex Legends', gameCategory: 'battle-royale',
    title: 'Duo für Ranked – Diamond Push',
    description: 'Pred-Player sucht Duo. Voice im Discord. Kein Whining.',
    maxSlots: 3, requiresMic: true, language: 'en', minRank: 'Diamant',
    members: [
      { userId: 'u5', username: 'PixelQueen', isReady: true, joinedAt: 0 },
    ],
    createdBy: { userId: 'u5', username: 'PixelQueen' },
  },
  {
    game: 'League of Legends', gameCategory: 'moba',
    title: 'Clash-Team sucht Support & Jungle',
    description: 'Gold+ bitte. Wir sind chill aber wollen gewinnen.',
    maxSlots: 5, requiresMic: false, language: 'de', minRank: 'Gold',
    members: [
      { userId: 'u1', username: 'NeonBlade_X',  isReady: true,  joinedAt: 0 },
      { userId: 'u3', username: 'StarDust_Ria',  isReady: true,  joinedAt: 0 },
      { userId: 'u9', username: 'ThunderPunch',  isReady: false, joinedAt: 0 },
    ],
    createdBy: { userId: 'u1', username: 'NeonBlade_X' },
  },
]

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateJoinCode() {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

function docToLobby(snap) {
  const data = snap.data({ serverTimestamps: 'estimate' })
  const allReadyAt = data.allReadyAt?.toDate?.()?.toISOString() ?? data.allReadyAt ?? null
  return { ...data, lobbyId: snap.id, allReadyAt }
}

// Seed nur wenn Collection leer (einmaliger Demo-Datensatz)
export async function seedIfEmpty() {
  const snap = await getDocs(collection(db, COL))
  if (!snap.empty) return
  const now = Date.now()
  await Promise.all(SEED.map((s, i) => addDoc(collection(db, COL), {
    ...s,
    createdAt: new Date(now - (i + 1) * 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  })))
}

// Echtzeit-Abo für alle Lobbys — gibt unsubscribe zurück
export function subscribeToLobbies(callback) {
  return onSnapshot(collection(db, COL), snap => {
    const now = new Date().toISOString()
    const fresh = snap.docs.map(docToLobby).filter(l => l.expiresAt > now)
    snap.docs
      .filter(d => d.data().expiresAt <= now)
      .forEach(d => deleteDoc(d.ref))
    callback(fresh)
  })
}

// Echtzeit-Abo für eine einzelne Lobby — gibt unsubscribe zurück
export function subscribeLobby(lobbyId, callback) {
  return onSnapshot(doc(db, COL, lobbyId), snap => {
    callback(snap.exists() ? docToLobby(snap) : null)
  })
}

export async function findLobbyByCode(code) {
  const q = query(collection(db, COL), where('joinCode', '==', code.toUpperCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const lobby = docToLobby(snap.docs[0])
  return lobby.expiresAt > new Date().toISOString() ? lobby : null
}

export async function getAllLobbies() {
  const snap = await getDocs(collection(db, COL))
  const now = new Date().toISOString()
  return snap.docs.map(docToLobby).filter(l => l.expiresAt > now)
}

export function isLobbyFull(lobby) {
  return lobby.members.length >= lobby.maxSlots
}

export async function getUserLobby(userId) {
  const lobbies = await getAllLobbies()
  return lobbies.find(l => l.members.some(m => m.userId === userId)) ?? null
}

// Gibt verbleibende ms zurück, bis der User einer neuen Lobby beitreten darf.
export function joinBlockMs(userId) {
  const left = _leftAt.get(userId)
  if (!left) return 0
  return Math.max(0, JOIN_BLOCK_MS - (Date.now() - left))
}

// Gibt verbleibende ms zurück, bis der User seine aktuelle Lobby verlassen darf.
// Nimmt das Lobby-Objekt direkt entgegen (kein extra Firestore-Read nötig).
export function leaveBlockMs(lobby, userId) {
  const member = lobby?.members.find(m => m.userId === userId)
  if (!member?.joinedAt) return 0
  return Math.max(0, LEAVE_BLOCK_MS - (Date.now() - member.joinedAt))
}

const VALID_PLATFORMS = ['crossplay', 'pc', 'ps5', 'xbox', 'switch', 'mobile']
const VALID_REGIONS   = ['eu', 'na', 'as', 'sa', 'oc']
const VALID_MODES     = ['casual', 'ranked', 'competitive', 'fun']
const VALID_GENDERS   = ['any', 'mixed', 'male', 'female']

export async function createLobby(
  { game, gameCategory, title, description, maxSlots, requiresMic, language, minRank,
    platform, region, mode, gender, minAge },
  creator
) {
  const data = {
    game:         sanitizeText(game, 50),
    gameCategory: gameCategory ?? 'other',
    title:        sanitizeText(title, 80),
    description:  sanitizeText(description, 200),
    maxSlots:     Math.min(Math.max(parseInt(maxSlots) || 5, 2), 10),
    requiresMic:  Boolean(requiresMic),
    language:     language ?? 'de',
    minRank:      minRank && minRank !== 'Keine' ? minRank : null,
    platform:     VALID_PLATFORMS.includes(platform) ? platform : 'crossplay',
    region:       VALID_REGIONS.includes(region) ? region : 'eu',
    mode:         VALID_MODES.includes(mode) ? mode : 'casual',
    gender:       VALID_GENDERS.includes(gender) ? gender : 'any',
    minAge:       [0, 16, 18, 25].includes(Number(minAge)) ? Number(minAge) : 0,
    members:      [{ userId: creator.userId, username: creator.username, isReady: false, joinedAt: Date.now() }],
    createdBy:    { userId: creator.userId, username: creator.username },
    joinCode:     generateJoinCode(),
    createdAt:    new Date().toISOString(),
    expiresAt:    new Date(Date.now() + TTL_MS).toISOString(),
  }
  const ref = await addDoc(collection(db, COL), data)
  return { ...data, lobbyId: ref.id }
}

export async function joinLobby(lobbyId, user) {
  const snap = await getDoc(doc(db, COL, lobbyId))
  if (!snap.exists())                                          throw new Error('Lobby nicht gefunden.')
  const lobby = docToLobby(snap)
  if (isLobbyFull(lobby))                                     throw new Error('Lobby ist voll.')
  if (lobby.members.some(m => m.userId === user.userId))      throw new Error('Bereits in dieser Lobby.')

  const userLobby = await getUserLobby(user.userId)
  if (userLobby)                                              throw new Error('Du bist bereits in einer anderen Lobby.')

  const block = joinBlockMs(user.userId)
  if (block > 0) {
    const secs = Math.ceil(block / 1000)
    throw new Error(`Bitte warte noch ${secs} Sekunde${secs !== 1 ? 'n' : ''}, bevor du eine neue Lobby betrittst.`)
  }

  const newMembers = [
    ...lobby.members,
    { userId: user.userId, username: user.username, isReady: false, joinedAt: Date.now() },
  ]
  const patch = { members: newMembers }
  if (lobby.allReadyAt) patch.allReadyAt = null
  await updateDoc(doc(db, COL, lobbyId), patch)
  return { ...lobby, ...patch }
}

export async function dissolveLobby(lobbyId, userId) {
  const snap = await getDoc(doc(db, COL, lobbyId))
  if (!snap.exists()) return
  const lobby = docToLobby(snap)
  if (lobby.createdBy?.userId !== userId) throw new Error('Nur der Host kann die Lobby auflösen.')
  await deleteDoc(doc(db, COL, lobbyId))
}

export async function kickMember(lobbyId, hostUserId, targetUserId) {
  const snap = await getDoc(doc(db, COL, lobbyId))
  if (!snap.exists()) return
  const lobby = docToLobby(snap)
  if (lobby.createdBy?.userId !== hostUserId) throw new Error('Nur der Host kann Spieler kicken.')
  if (targetUserId === hostUserId)            throw new Error('Du kannst dich nicht selbst kicken.')
  const remaining = lobby.members.filter(m => m.userId !== targetUserId)
  const patch = { members: remaining }
  if (lobby.allReadyAt && remaining.some(m => !m.isReady)) patch.allReadyAt = null
  await updateDoc(doc(db, COL, lobbyId), patch)
}

export async function leaveLobby(lobbyId, userId) {
  const snap = await getDoc(doc(db, COL, lobbyId))
  if (!snap.exists()) return
  const lobby = docToLobby(snap)

  const block = leaveBlockMs(lobby, userId)
  if (block > 0) {
    const secs = Math.ceil(block / 1000)
    throw new Error(`Noch ${secs} Sekunde${secs !== 1 ? 'n' : ''} – du kannst die Lobby erst nach 1 Minute verlassen.`)
  }

  _leftAt.set(userId, Date.now())

  const remaining = lobby.members.filter(m => m.userId !== userId)
  if (remaining.length === 0) {
    await deleteDoc(doc(db, COL, lobbyId))
  } else {
    await updateDoc(doc(db, COL, lobbyId), { members: remaining })
  }
}

export function subscribeChat(lobbyId, callback) {
  const q = query(
    collection(db, COL, lobbyId, 'messages'),
    orderBy('at', 'asc'),
    limit(100),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function sendMessage(lobbyId, user, text) {
  const clean = sanitizeText(text, 300)
  if (!clean) return
  await addDoc(collection(db, COL, lobbyId, 'messages'), {
    userId:   user.userId,
    username: user.username,
    text:     clean,
    at:       new Date().toISOString(),
  })
}

export async function updateUsernameInLobby(userId, newUsername) {
  const lobby = await getUserLobby(userId)
  if (!lobby) return
  const members = lobby.members.map(m =>
    m.userId === userId ? { ...m, username: newUsername } : m
  )
  const patch = { members }
  if (lobby.createdBy?.userId === userId) patch.createdBy = { ...lobby.createdBy, username: newUsername }
  await updateDoc(doc(db, COL, lobby.lobbyId), patch)
}

export async function setReady(lobbyId, userId, isReady) {
  const snap = await getDoc(doc(db, COL, lobbyId))
  if (!snap.exists()) return null
  const lobby = docToLobby(snap)

  // Kein un-ready mehr sobald der Game-Timer gestartet ist
  if (!isReady && lobby.allReadyAt) return lobby

  const members = lobby.members.map(m => m.userId === userId ? { ...m, isReady } : m)

  const allReady = members.length >= 2 && members.every(m => m.isReady)
  const patch = { members }
  if (allReady && !lobby.allReadyAt) {
    patch.allReadyAt = serverTimestamp()
  } else if (!allReady && lobby.allReadyAt) {
    patch.allReadyAt = null
  }

  await updateDoc(doc(db, COL, lobbyId), patch)
  return { ...lobby, ...patch }
}
