import { pb, subscribeList, isNotFound } from './pocketbase'
import { sanitizeText } from '../utils/sanitize'

export const RANK_OPTIONS = ['Keine', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Radiant']

export const LANGUAGE_OPTIONS = [
  { value: 'de',  label: 'Deutsch' },
  { value: 'en',  label: 'English' },
  { value: 'any', label: 'Egal'    },
]

const COL            = 'lobbies'
const MSG_COL        = 'lobby_messages'
const TTL_MS         = 4 * 60 * 60 * 1000
const LEAVE_BLOCK_MS = 60 * 1000
const JOIN_BLOCK_MS  = 45 * 1000

const col = () => pb.collection(COL)

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

function toLobby(r) {
  const { id, collectionId, collectionName, updated, ...data } = r
  return {
    ...data,
    lobbyId:    id,
    members:    data.members ?? [],
    minRank:    data.minRank || null,
    allReadyAt: data.allReadyAt || null,
  }
}

async function fetchLobby(lobbyId) {
  try {
    return toLobby(await col().getOne(lobbyId))
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

const isFresh = (l) => l.expiresAt > new Date().toISOString()

// Seed nur wenn Collection leer (einmaliger Demo-Datensatz)
export async function seedIfEmpty() {
  if (!pb.authStore.isValid) return
  const res = await col().getList(1, 1, { fields: 'id' })
  if (res.totalItems) return
  const now = Date.now()
  await Promise.all(SEED.map((s, i) => col().create({
    ...s,
    createdAt: new Date(now - (i + 1) * 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  })))
}

// Echtzeit-Abo für alle Lobbys — gibt unsubscribe zurück. Abgelaufene löscht der Server-Cron.
export function subscribeToLobbies(callback) {
  return subscribeList(COL, {}, recs => callback(recs.map(toLobby).filter(isFresh)))
}

// Echtzeit-Abo für eine einzelne Lobby — gibt unsubscribe zurück
export function subscribeLobby(lobbyId, callback) {
  const filter = pb.filter('id = {:id}', { id: lobbyId })
  return subscribeList(COL, { filter }, recs => callback(recs[0] ? toLobby(recs[0]) : null))
}

export async function findLobbyByCode(code) {
  try {
    const rec = await col().getFirstListItem(pb.filter('joinCode = {:c}', { c: code.toUpperCase().trim() }))
    const lobby = toLobby(rec)
    return isFresh(lobby) ? lobby : null
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function getAllLobbies() {
  const recs = await col().getFullList()
  return recs.map(toLobby).filter(isFresh)
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
// Nimmt das Lobby-Objekt direkt entgegen (kein extra Read nötig).
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
  const rec = await col().create({ ...data, minRank: data.minRank ?? '' })
  return { ...data, lobbyId: rec.id }
}

export async function joinLobby(lobbyId, user) {
  const lobby = await fetchLobby(lobbyId)
  if (!lobby)                                                  throw new Error('Lobby nicht gefunden.')
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
  if (lobby.allReadyAt) patch.allReadyAt = ''
  return toLobby(await col().update(lobbyId, patch))
}

export async function dissolveLobby(lobbyId, userId) {
  const lobby = await fetchLobby(lobbyId)
  if (!lobby) return
  if (lobby.createdBy?.userId !== userId) throw new Error('Nur der Host kann die Lobby auflösen.')
  await col().delete(lobbyId)
}

export async function kickMember(lobbyId, hostUserId, targetUserId) {
  const lobby = await fetchLobby(lobbyId)
  if (!lobby) return
  if (lobby.createdBy?.userId !== hostUserId) throw new Error('Nur der Host kann Spieler kicken.')
  if (targetUserId === hostUserId)            throw new Error('Du kannst dich nicht selbst kicken.')
  const remaining = lobby.members.filter(m => m.userId !== targetUserId)
  const patch = { members: remaining }
  if (lobby.allReadyAt && remaining.some(m => !m.isReady)) patch.allReadyAt = ''
  await col().update(lobbyId, patch)
}

export async function leaveLobby(lobbyId, userId) {
  const lobby = await fetchLobby(lobbyId)
  if (!lobby) return

  const block = leaveBlockMs(lobby, userId)
  if (block > 0) {
    const secs = Math.ceil(block / 1000)
    throw new Error(`Noch ${secs} Sekunde${secs !== 1 ? 'n' : ''} – du kannst die Lobby erst nach 1 Minute verlassen.`)
  }

  _leftAt.set(userId, Date.now())

  const remaining = lobby.members.filter(m => m.userId !== userId)
  if (remaining.length === 0) {
    await col().delete(lobbyId)
  } else {
    await col().update(lobbyId, { members: remaining })
  }
}

// Letzte 100 Nachrichten, aufsteigend sortiert
export function subscribeChat(lobbyId, callback) {
  const filter = pb.filter('lobby = {:id}', { id: lobbyId })
  return subscribeList(MSG_COL, { filter, sort: '-at', limit: 100 }, recs => {
    callback(
      recs
        .map(({ id, userId, username, text, at }) => ({ id, userId, username, text, at }))
        .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
    )
  })
}

export async function sendMessage(lobbyId, user, text) {
  const clean = sanitizeText(text, 300)
  if (!clean) return
  await pb.collection(MSG_COL).create({
    lobby:    lobbyId,
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
  await col().update(lobby.lobbyId, patch)
}

export async function setReady(lobbyId, userId, isReady) {
  const lobby = await fetchLobby(lobbyId)
  if (!lobby) return null

  // Kein un-ready mehr sobald der Game-Timer gestartet ist
  if (!isReady && lobby.allReadyAt) return lobby

  const members = lobby.members.map(m => m.userId === userId ? { ...m, isReady } : m)

  const allReady = members.length >= 2 && members.every(m => m.isReady)
  const patch = { members }
  if (allReady && !lobby.allReadyAt) {
    patch.allReadyAt = new Date().toISOString() // Server-Hook überschreibt mit Serverzeit
  } else if (!allReady && lobby.allReadyAt) {
    patch.allReadyAt = ''
  }

  const rec = await col().update(lobbyId, patch)
  return toLobby(rec)
}
